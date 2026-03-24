#!/usr/bin/env python3
"""
build_db.py — Construit la base SQLite prenoms.db à partir des 4 sources.

Usage: python scripts/build_db.py

Tables créées:
  - naissances (prenom, sexe, annee, nombre)
  - survie (annee_naissance, sexe, taux_survie)
  - deces_par_an (prenom, annee_deces, nombre, somme_ages)
  - deces_par_age (prenom, age_deces, nombre)
  - elus (prenom, niveau, nombre)
  - celebrites (prenom, nom_complet, categorie, annee_naissance, annee_deces, age_deces, image)
"""

import glob
import os
import sys
import sqlite3
import unicodedata
import pandas as pd
import numpy as np
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "prenoms.db"
CURRENT_YEAR = 2026


def normalize_prenom(s):
    """Remove accents and normalize: GÉRARD -> GERARD, preserving hyphens."""
    if not isinstance(s, str):
        return s
    nfkd = unicodedata.normalize("NFD", s)
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn").upper().strip()


def create_tables(conn):
    """Create all tables with indexes."""
    conn.executescript("""
        DROP TABLE IF EXISTS naissances;
        DROP TABLE IF EXISTS survie;
        DROP TABLE IF EXISTS deces_par_an;
        DROP TABLE IF EXISTS deces_par_age;
        DROP TABLE IF EXISTS elus;
        DROP TABLE IF EXISTS meta;

        CREATE TABLE naissances (
            prenom TEXT NOT NULL,
            sexe TEXT NOT NULL,
            annee INTEGER NOT NULL,
            nombre INTEGER NOT NULL
        );

        CREATE TABLE survie (
            annee_naissance INTEGER NOT NULL,
            sexe TEXT NOT NULL,
            taux_survie REAL NOT NULL
        );

        CREATE TABLE deces_par_an (
            prenom TEXT NOT NULL,
            annee_deces INTEGER NOT NULL,
            nombre INTEGER NOT NULL,
            somme_ages REAL NOT NULL
        );

        CREATE TABLE deces_par_age (
            prenom TEXT NOT NULL,
            age_deces INTEGER NOT NULL,
            nombre INTEGER NOT NULL
        );

        CREATE TABLE elus (
            prenom TEXT NOT NULL,
            niveau TEXT NOT NULL,
            nombre INTEGER NOT NULL
        );

        CREATE TABLE celebrites (
            prenom TEXT NOT NULL,
            nom_complet TEXT NOT NULL,
            categorie TEXT,
            annee_naissance INTEGER,
            annee_deces INTEGER,
            age_deces INTEGER,
            image TEXT
        );

        CREATE TABLE meta (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    """)


def create_indexes(conn):
    """Create indexes after bulk insert for performance."""
    print("📊 Création des index...")
    conn.executescript("""
        CREATE INDEX idx_naissances_prenom ON naissances(prenom);
        CREATE INDEX idx_deces_par_an_prenom ON deces_par_an(prenom);
        CREATE INDEX idx_deces_par_age_prenom ON deces_par_age(prenom);
        CREATE INDEX idx_elus_prenom ON elus(prenom);
        CREATE INDEX idx_celebrites_prenom ON celebrites(prenom);
        CREATE INDEX idx_survie_annee ON survie(annee_naissance, sexe);
    """)


def load_naissances(conn):
    """Source A — Prénoms depuis 1900."""
    print("📊 [A] Chargement des naissances...")
    path = DATA_DIR / "prenoms-2024-nat.csv"
    if not path.exists():
        path = DATA_DIR / "nat2024.csv"

    df = pd.read_csv(path, sep=";", dtype=str)
    df.columns = [c.strip().lower() for c in df.columns]
    col_map = {
        "preusuel": "prenom", "prenom": "prenom",
        "sexe": "sexe",
        "annais": "annee", "periode": "annee",
        "nombre": "nombre", "valeur": "nombre",
    }
    df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

    df = df[df["prenom"] != "_PRENOMS_RARES_"]
    df = df[df["annee"] != "XXXX"]
    df["nombre"] = pd.to_numeric(df["nombre"], errors="coerce").fillna(0).astype(int)
    df["annee"] = df["annee"].astype(int)
    df["prenom"] = df["prenom"].apply(normalize_prenom)
    df["sexe"] = df["sexe"].astype(str).str.strip()

    # Aggregate duplicates after normalization (e.g. GÉRARD + GERARD)
    df = df.groupby(["prenom", "sexe", "annee"])["nombre"].sum().reset_index()

    rows = list(df[["prenom", "sexe", "annee", "nombre"]].itertuples(index=False, name=None))
    conn.executemany("INSERT INTO naissances VALUES (?,?,?,?)", rows)

    n_prenoms = df["prenom"].nunique()
    print(f"   {len(rows)} lignes, {n_prenoms} prénoms")
    return set(df["prenom"].unique())


def load_survie(conn):
    """Source C — Taux de survie par cohorte (pyramide des âges INSEE 2026)."""
    print("📊 [C] Chargement de la pyramide des âges...")
    path = DATA_DIR / "pop_age_2026.xlsx"
    df_pop = pd.read_excel(path, sheet_name="2026", header=None)

    # Use France entière columns if available (cols 5-7), otherwise métropole (cols 2-4)
    use_france = df_pop.shape[1] >= 8
    col_hommes = 6 if use_france else 3
    col_femmes = 7 if use_france else 4

    # Get total births per cohort from naissances table
    births_df = pd.read_sql(
        "SELECT annee as annee_naissance, sexe, SUM(nombre) as total_births FROM naissances GROUP BY annee, sexe",
        conn
    )

    rows = []
    for i in range(6, df_pop.shape[0]):
        try:
            year = int(float(str(df_pop.iloc[i, 0]).strip()))
        except (ValueError, TypeError):
            continue
        if year < 1900 or year > 2025:
            continue

        for sexe, col in [("1", col_hommes), ("2", col_femmes)]:
            try:
                pop = float(df_pop.iloc[i, col])
                if pd.isna(pop) or pop <= 0:
                    continue
                match = births_df[
                    (births_df["annee_naissance"] == year) & (births_df["sexe"] == sexe)
                ]
                if len(match) > 0 and match["total_births"].values[0] > 0:
                    taux = min(pop / match["total_births"].values[0], 1.0)
                    rows.append((year, sexe, taux))
            except (ValueError, TypeError):
                continue

    conn.executemany("INSERT INTO survie VALUES (?,?,?)", rows)
    print(f"   {len(rows)} cohortes")


def load_deces(conn, known_prenoms):
    """Source B — Fichier des personnes décédées (1970-2025)."""
    print("📊 [B] Chargement des décès...")
    files = sorted(glob.glob(str(DATA_DIR / "deces" / "deces-*.txt")))
    if not files:
        print("   ⚠️  Aucun fichier trouvé")
        return

    # Build compound prenom lookup
    compound_lookup = {}
    for p in known_prenoms:
        if not isinstance(p, str):
            continue
        if "-" in p:
            parts = tuple(p.split("-"))
            if len(parts) == 2:
                compound_lookup[parts] = p

    def extract_record(line):
        """Extract (prenom, annee_naissance, annee_deces) from a death record line."""
        if len(line) < 162:
            return None
        try:
            # Prenom
            part = line[0:80].strip()
            if "*" not in part:
                return None
            after_star = part.split("*", 1)[1].strip()
            if "/" in after_star:
                after_star = after_star.split("/")[0].strip()
            tokens = after_star.split()
            if not tokens:
                return None

            first = normalize_prenom(tokens[0])

            if "-" in first:
                if not all(p.isalpha() for p in first.split("-")):
                    return None
                prenom = first
            else:
                if not first.isalpha():
                    return None
                # Try compound
                if len(tokens) >= 2:
                    second = normalize_prenom(tokens[1])
                    compound = compound_lookup.get((first, second))
                    if compound:
                        prenom = compound
                    else:
                        prenom = first
                else:
                    prenom = first

            # Date de naissance (positions 82-89, format AAAAMMJJ)
            date_nais = line[81:89].strip()
            annee_nais = int(date_nais[0:4]) if len(date_nais) >= 4 and date_nais[0:4].isdigit() else None

            # Date de décès (positions 155-162, format AAAAMMJJ)
            date_deces = line[154:162].strip()
            annee_deces = int(date_deces[0:4]) if len(date_deces) >= 4 and date_deces[0:4].isdigit() else None

            if annee_nais and annee_deces and 1800 < annee_nais < 2026 and 1970 <= annee_deces <= 2026:
                return (prenom, annee_nais, annee_deces)
        except (IndexError, ValueError):
            pass
        return None

    # Process all files, aggregate in memory
    deces_par_an = {}   # (prenom, annee_deces) -> (count, sum_ages)
    deces_par_age = {}  # (prenom, age) -> count
    total_records = 0

    for path in files:
        basename = os.path.basename(path)
        # Skip monthly/quarterly files
        parts = basename.replace(".txt", "").split("-")
        if len(parts) > 2:
            continue
        try:
            year = int(parts[1])
        except (IndexError, ValueError):
            continue

        print(f"   {basename}...")
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                rec = extract_record(line)
                if rec is None:
                    continue
                prenom, annee_nais, annee_deces = rec
                age = annee_deces - annee_nais
                if age < 0 or age > 130:
                    continue

                total_records += 1

                key_an = (prenom, annee_deces)
                if key_an in deces_par_an:
                    c, s = deces_par_an[key_an]
                    deces_par_an[key_an] = (c + 1, s + age)
                else:
                    deces_par_an[key_an] = (1, age)

                key_age = (prenom, age)
                deces_par_age[key_age] = deces_par_age.get(key_age, 0) + 1

    print(f"   {total_records:,} décès traités")

    # Insert deces_par_an
    rows_an = [(k[0], k[1], v[0], v[1]) for k, v in deces_par_an.items()]
    conn.executemany("INSERT INTO deces_par_an VALUES (?,?,?,?)", rows_an)
    print(f"   {len(rows_an):,} lignes dans deces_par_an")

    # Insert deces_par_age
    rows_age = [(k[0], k[1], v) for k, v in deces_par_age.items()]
    conn.executemany("INSERT INTO deces_par_age VALUES (?,?,?)", rows_age)
    print(f"   {len(rows_age):,} lignes dans deces_par_age")


def load_elus(conn):
    """Source D — Répertoire National des Élus."""
    print("📊 [D] Chargement du RNE...")
    rne_files = {
        "municipal": ["cm.csv", "maires.csv"],
        "intercommunal": ["epci.csv"],
        "departemental": ["cd.csv"],
        "regional": ["cr.csv"],
        "national": ["deputes.csv", "senateurs.csv"],
        "europeen": ["europeens.csv"],
    }

    all_counts = {}  # (prenom, niveau) -> count

    for niveau, filenames in rne_files.items():
        for fname in filenames:
            path = DATA_DIR / "rne" / fname
            if not path.exists():
                print(f"   ⚠️  {fname} non trouvé")
                continue
            try:
                df = pd.read_csv(path, sep=";", dtype=str, encoding="utf-8", on_bad_lines="skip")
                prenom_col = None
                for c in df.columns:
                    if "prénom" in c.lower() or "prenom" in c.lower():
                        prenom_col = c
                        break
                if prenom_col is None:
                    print(f"   ⚠️  Pas de colonne prénom dans {fname}")
                    continue

                for val in df[prenom_col].dropna():
                    p = normalize_prenom(val)
                    if p:
                        key = (p, niveau)
                        all_counts[key] = all_counts.get(key, 0) + 1

                print(f"   {fname}: {len(df)} élus")
            except Exception as e:
                print(f"   ⚠️  Erreur {fname}: {e}")

    rows = [(k[0], k[1], v) for k, v in all_counts.items()]
    conn.executemany("INSERT INTO elus VALUES (?,?,?)", rows)

    total = sum(v for v in all_counts.values())
    print(f"   {total:,} élus, {len(rows)} lignes")

    # Store total in meta
    conn.execute("INSERT OR REPLACE INTO meta VALUES ('total_elus', ?)", (str(total),))


def load_celebrites(conn):
    """Personnalités françaises décédées."""
    print("📊 [E] Chargement des célébrités...")
    import csv

    # Mapping pluriel → (masculin singulier, féminin singulier)
    CATEGORIE_MAP = {
        "Acteurs":                      ("Acteur", "Actrice"),
        "Chanteurs":                    ("Chanteur", "Chanteuse"),
        "Responsables politiques":      ("Homme politique", "Femme politique"),
        "Sportifs":                     ("Sportif", "Sportive"),
        "Écrivains":                    ("Écrivain", "Écrivaine"),
        "Réalisateurs":                 ("Réalisateur", "Réalisatrice"),
        "Journalistes":                 ("Journaliste", "Journaliste"),
        "Animateurs":                   ("Animateur", "Animatrice"),
        "Personnalités d'affaires":     ("Homme d'affaires", "Femme d'affaires"),
        "Dessinateurs":                 ("Dessinateur", "Dessinatrice"),
        "Musiciens":                    ("Musicien", "Musicienne"),
        "Compositeurs":                 ("Compositeur", "Compositrice"),
        "Humoristes":                   ("Humoriste", "Humoriste"),
        "Producteurs":                  ("Producteur", "Productrice"),
        "Créateurs de mode":            ("Créateur de mode", "Créatrice de mode"),
        "Scientifiques":                ("Scientifique", "Scientifique"),
        "Cuisiniers":                   ("Cuisinier", "Cuisinière"),
        "Religieux":                    ("Religieux", "Religieuse"),
        "Éditeurs":                     ("Éditeur", "Éditrice"),
        "Danseurs":                     ("Danseur", "Danseuse"),
        "Noblesse et royautés":         ("Noble", "Noble"),
        "Médecins":                     ("Médecin", "Médecin"),
        "Ingénieurs":                   ("Ingénieur", "Ingénieure"),
        "Criminels":                    ("Criminel", "Criminelle"),
        "Avocats":                      ("Avocat", "Avocate"),
        "Astronautes":                  ("Astronaute", "Astronaute"),
        "Syndicalistes":                ("Syndicaliste", "Syndicaliste"),
        "Premières dames":              ("Première dame", "Première dame"),
        "Chefs d'orchestre":            ("Chef d'orchestre", "Cheffe d'orchestre"),
        "Architectes":                  ("Architecte", "Architecte"),
        "Photographes":                 ("Photographe", "Photographe"),
        "Militaires":                   ("Militaire", "Militaire"),
        "Inventeurs":                   ("Inventeur", "Inventrice"),
        "Scénaristes":                  ("Scénariste", "Scénariste"),
        "Sculpteurs":                   ("Sculpteur", "Sculptrice"),
        "Philosophes":                  ("Philosophe", "Philosophe"),
        "Peintres":                     ("Peintre", "Peintre"),
        "Mannequins":                   ("Mannequin", "Mannequin"),
        "Economistes":                  ("Économiste", "Économiste"),
        "Personnalités des réseaux sociaux": ("Influenceur", "Influenceuse"),
        "Milliardaires":                ("Milliardaire", "Milliardaire"),
        "Metteurs en scène":            ("Metteur en scène", "Metteuse en scène"),
        "Marques de fondateurs":        ("Fondateur", "Fondatrice"),
        "Magiciens":                    ("Magicien", "Magicienne"),
        "Joueurs d'échecs":             ("Joueur d'échecs", "Joueuse d'échecs"),
        "Historiens":                   ("Historien", "Historienne"),
        "Développeurs":                 ("Développeur", "Développeuse"),
        "Aviateurs":                    ("Aviateur", "Aviatrice"),
        "Divers":                       ("Personnalité", "Personnalité"),
    }

    # Build sex lookup from naissances table
    sexe_par_prenom = {}
    if table_exists(conn, "naissances"):
        rows_sex = conn.execute(
            "SELECT prenom, sexe, SUM(nombre) as n FROM naissances GROUP BY prenom, sexe"
        ).fetchall()
        prenom_sex_counts = {}
        for prenom, sexe, n in rows_sex:
            if prenom not in prenom_sex_counts:
                prenom_sex_counts[prenom] = {}
            prenom_sex_counts[prenom][sexe] = n
        for prenom, counts in prenom_sex_counts.items():
            h = counts.get("1", 0)
            f = counts.get("2", 0)
            sexe_par_prenom[prenom] = "F" if f > h else "M"

    path = DATA_DIR / "celebrities" / "personnalites_francaises_decedees_2000_2026.csv"
    if not path.exists():
        print("   ⚠️  Fichier célébrités non trouvé")
        return

    rows = []
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            prenom_raw = row.get("Prénom", "").strip()
            nom = row.get("Nom", "").strip()
            if not prenom_raw or not nom:
                continue

            prenom = normalize_prenom(prenom_raw)
            nom_complet = f"{prenom_raw} {nom}"
            cat_pluriel = row.get("Catégorie", "").strip()
            image = row.get("Fichier image", "").strip() or None

            # Resolve gendered singular category
            sexe = sexe_par_prenom.get(prenom, "M")
            cat_pair = CATEGORIE_MAP.get(cat_pluriel)
            if cat_pair:
                categorie = cat_pair[1] if sexe == "F" else cat_pair[0]
            else:
                categorie = cat_pluriel  # fallback

            try:
                annee_naissance = int(row.get("Année de naissance", 0))
            except (ValueError, TypeError):
                annee_naissance = None
            try:
                age = int(row.get("Âge", 0))
            except (ValueError, TypeError):
                age = None

            date_deces = row.get("Date de décès", "")
            try:
                parts = date_deces.split("/")
                annee_deces = int(parts[2]) if len(parts) == 3 else None
            except (ValueError, TypeError, IndexError):
                annee_deces = None

            rows.append((prenom, nom_complet, categorie, annee_naissance, annee_deces, age, image))

    conn.executemany("INSERT INTO celebrites VALUES (?,?,?,?,?,?,?)", rows)
    print(f"   {len(rows)} personnalités chargées")


def store_meta(conn):
    """Store metadata."""
    conn.execute("INSERT OR REPLACE INTO meta VALUES ('population_france', '68000000')")
    conn.execute("INSERT OR REPLACE INTO meta VALUES ('current_year', ?)", (str(CURRENT_YEAR),))
    conn.execute("INSERT OR REPLACE INTO meta VALUES ('build_date', datetime('now'))")


ALL_STEPS = ["naissances", "survie", "deces", "elus", "celebrites"]


def table_exists(conn, name):
    r = conn.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone()
    return r[0] > 0


def rebuild_table(conn, table_name):
    """Drop and recreate a single table."""
    # Map table names to their CREATE statements
    creates = {
        "naissances": """CREATE TABLE IF NOT EXISTS naissances (
            prenom TEXT NOT NULL, sexe TEXT NOT NULL, annee INTEGER NOT NULL, nombre INTEGER NOT NULL)""",
        "survie": """CREATE TABLE IF NOT EXISTS survie (
            annee_naissance INTEGER NOT NULL, sexe TEXT NOT NULL, taux_survie REAL NOT NULL)""",
        "deces_par_an": """CREATE TABLE IF NOT EXISTS deces_par_an (
            prenom TEXT NOT NULL, annee_deces INTEGER NOT NULL, nombre INTEGER NOT NULL, somme_ages REAL NOT NULL)""",
        "deces_par_age": """CREATE TABLE IF NOT EXISTS deces_par_age (
            prenom TEXT NOT NULL, age_deces INTEGER NOT NULL, nombre INTEGER NOT NULL)""",
        "elus": """CREATE TABLE IF NOT EXISTS elus (
            prenom TEXT NOT NULL, niveau TEXT NOT NULL, nombre INTEGER NOT NULL)""",
        "celebrites": """CREATE TABLE IF NOT EXISTS celebrites (
            prenom TEXT NOT NULL, nom_complet TEXT NOT NULL, categorie TEXT,
            annee_naissance INTEGER, annee_deces INTEGER, age_deces INTEGER, image TEXT)""",
        "meta": """CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)""",
    }

    # Which tables to drop per step
    step_tables = {
        "naissances": ["naissances"],
        "survie": ["survie"],
        "deces": ["deces_par_an", "deces_par_age"],
        "elus": ["elus"],
        "celebrites": ["celebrites"],
    }

    for t in step_tables.get(table_name, [table_name]):
        conn.execute(f"DROP TABLE IF EXISTS {t}")
        if t in creates:
            conn.execute(creates[t])

    # Ensure meta table always exists
    conn.execute(creates["meta"])


def get_known_prenoms(conn):
    """Get known prenoms from existing naissances table."""
    if not table_exists(conn, "naissances"):
        return set()
    rows = conn.execute("SELECT DISTINCT prenom FROM naissances").fetchall()
    return {r[0] for r in rows}


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Build prenoms.db")
    parser.add_argument("steps", nargs="*", default=[],
                        help=f"Steps to rebuild: {', '.join(ALL_STEPS)} (default: all, or only missing)")
    parser.add_argument("--full", action="store_true", help="Full rebuild from scratch")
    args = parser.parse_args()

    print("=" * 60)
    print("🏗️  build_db.py — Construction de prenoms.db")
    print("=" * 60)

    if args.full and DB_PATH.exists():
        DB_PATH.unlink()
        print("   Full rebuild demandé, base supprimée")

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")

    # Determine what to build
    if args.steps:
        steps = args.steps
        print(f"   Rebuild partiel : {', '.join(steps)}")
    elif not DB_PATH.exists() or args.full:
        steps = ALL_STEPS
        print("   Full build")
    else:
        # Only build missing tables
        check = {
            "naissances": "naissances",
            "survie": "survie",
            "deces": "deces_par_an",
            "elus": "elus",
            "celebrites": "celebrites",
        }
        steps = [s for s, t in check.items() if not table_exists(conn, t)]
        if not steps:
            print("   Toutes les tables existent déjà. Utilisez --full ou spécifiez des étapes.")
            conn.close()
            return
        print(f"   Tables manquantes : {', '.join(steps)}")

    # Execute requested steps
    if "naissances" in steps:
        rebuild_table(conn, "naissances")
        load_naissances(conn)
        conn.commit()

    if "survie" in steps:
        rebuild_table(conn, "survie")
        load_survie(conn)
        conn.commit()

    if "deces" in steps:
        rebuild_table(conn, "deces")
        known = get_known_prenoms(conn)
        load_deces(conn, known)
        conn.commit()

    if "elus" in steps:
        rebuild_table(conn, "elus")
        load_elus(conn)
        conn.commit()

    if "celebrites" in steps:
        rebuild_table(conn, "celebrites")
        load_celebrites(conn)
        conn.commit()

    store_meta(conn)

    # Recreate indexes for rebuilt tables
    index_map = {
        "naissances": "CREATE INDEX IF NOT EXISTS idx_naissances_prenom ON naissances(prenom)",
        "deces": "CREATE INDEX IF NOT EXISTS idx_deces_par_an_prenom ON deces_par_an(prenom); CREATE INDEX IF NOT EXISTS idx_deces_par_age_prenom ON deces_par_age(prenom)",
        "elus": "CREATE INDEX IF NOT EXISTS idx_elus_prenom ON elus(prenom)",
        "survie": "CREATE INDEX IF NOT EXISTS idx_survie_annee ON survie(annee_naissance, sexe)",
        "celebrites": "CREATE INDEX IF NOT EXISTS idx_celebrites_prenom ON celebrites(prenom)",
    }
    for step in steps:
        if step in index_map:
            conn.executescript(index_map[step])

    conn.execute("ANALYZE")
    conn.commit()

    # Switch out of WAL mode so the DB is a single file (no -shm/-wal)
    try:
        conn.execute("PRAGMA journal_mode=DELETE")
        conn.execute("VACUUM")
        conn.commit()
    except sqlite3.OperationalError as e:
        print(f"   ⚠️  VACUUM skippé ({e}) — relancer sans l'API pour compacter")

    conn.close()

    size_mb = DB_PATH.stat().st_size / (1024 * 1024)
    print(f"\n✅ Base : {DB_PATH} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
