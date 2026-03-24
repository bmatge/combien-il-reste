#!/usr/bin/env python3
"""
build_stats.py — Génère prenoms_stats.json à partir des données INSEE + RNE.

Usage: python scripts/build_stats.py

Sources:
  A. data/prenoms-2024-nat.csv  — Prénoms depuis 1900 (INSEE)
  B. data/deces/deces-*.txt     — Fichier des personnes décédées (INSEE)
  C. data/pop_age_2026.xlsx     — Pyramide des âges détaillée au 1er janv. 2026 (INSEE)
  D. data/rne/*.csv             — Répertoire National des Élus
"""

import json
import glob
import os
import sys
import unicodedata
import pandas as pd
import numpy as np
from pathlib import Path


def normalize_prenom(s):
    """Remove accents and normalize: GÉRARD -> GERARD, preserving hyphens."""
    if not isinstance(s, str):
        return s
    nfkd = unicodedata.normalize("NFD", s)
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn").upper().strip()

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT = Path(__file__).resolve().parent.parent / "public" / "prenoms_stats.json"
POPULATION_FRANCE = 68_000_000
CURRENT_YEAR = 2026


def load_births():
    """Étape 1 — Naissances par prénom (Source A)"""
    print("📊 Chargement des naissances (Source A)...")
    # Try both possible filenames
    path = DATA_DIR / "prenoms-2024-nat.csv"
    if not path.exists():
        path = DATA_DIR / "nat2024.csv"
    df = pd.read_csv(path, sep=";", dtype=str)

    # Normalize column names to canonical form
    df.columns = [c.strip().lower() for c in df.columns]
    # Handle both old format (SEXE/PREUSUEL/ANNAIS/NOMBRE) and new (sexe/prenom/periode/valeur)
    col_map = {
        "preusuel": "PREUSUEL", "prenom": "PREUSUEL",
        "sexe": "SEXE",
        "annais": "ANNAIS", "periode": "ANNAIS",
        "nombre": "NOMBRE", "valeur": "NOMBRE",
    }
    df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

    df = df[df["PREUSUEL"] != "_PRENOMS_RARES_"]
    df = df[df["ANNAIS"] != "XXXX"]
    df["NOMBRE"] = pd.to_numeric(df["NOMBRE"], errors="coerce").fillna(0).astype(int)
    df["ANNAIS"] = df["ANNAIS"].astype(int)
    df["PREUSUEL"] = df["PREUSUEL"].apply(normalize_prenom)
    df["SEXE"] = df["SEXE"].astype(str).str.strip()

    print(f"   {len(df)} lignes, {df['PREUSUEL'].nunique()} prénoms uniques")
    return df


def load_survival(births_df):
    """Étape 2 — Taux de survie par cohorte (Source C)

    Fichier INSEE : 3_Pop1janv_age.xlsx
    Structure : une feuille par année (1901..2026)
    On lit la feuille '2026' qui donne la population vivante au 1er janvier 2026
    par année de naissance, avec colonnes :
      col 0 = Année de naissance
      col 3 = Hommes
      col 4 = Femmes
    (col 5-7 = France entière si disponible)
    """
    print("📊 Chargement des estimations de population (Source C)...")
    path = DATA_DIR / "pop_age_2026.xlsx"

    # Read sheet '2026' — population alive on Jan 1st 2026 by birth year
    df_pop = pd.read_excel(path, sheet_name="2026", header=None)
    print(f"   Feuille '2026': {df_pop.shape[0]} lignes, {df_pop.shape[1]} colonnes")

    # Parse: skip header rows, extract birth_year / hommes / femmes
    # Use France entière columns (5=Ensemble, 6=Hommes, 7=Femmes) if available,
    # otherwise France métropolitaine (2=Ensemble, 3=Hommes, 4=Femmes)
    use_france = df_pop.shape[1] >= 8
    col_hommes = 6 if use_france else 3
    col_femmes = 7 if use_france else 4
    label = "France entière" if use_france else "France métropolitaine"
    print(f"   Utilisation des colonnes {label}")

    rows = []
    for i in range(6, df_pop.shape[0]):  # data starts at row 6
        year_val = df_pop.iloc[i, 0]
        try:
            year = int(float(str(year_val).strip()))
        except (ValueError, TypeError):
            continue
        if year < 1900 or year > 2025:
            continue

        for sexe, col in [("1", col_hommes), ("2", col_femmes)]:
            try:
                pop = float(df_pop.iloc[i, col])
                if pd.isna(pop) or pop <= 0:
                    continue
                rows.append({"annee_naissance": year, "sexe": sexe, "pop_2026": pop})
            except (ValueError, TypeError):
                continue

    pop_df = pd.DataFrame(rows)
    print(f"   {len(pop_df)} entrées (année_naissance × sexe)")

    # Compute survival rate = pop_2026 / total_births for that cohort
    total_births = births_df.groupby(["ANNAIS", "SEXE"])["NOMBRE"].sum().reset_index()

    survival = pop_df.merge(
        total_births,
        left_on=["annee_naissance", "sexe"],
        right_on=["ANNAIS", "SEXE"],
        how="left",
    )
    survival["taux_survie"] = (survival["pop_2026"] / survival["NOMBRE"]).clip(0, 1)
    # For cohorts where births data is missing or zero, default to 0
    survival["taux_survie"] = survival["taux_survie"].fillna(0)
    survival = survival[["annee_naissance", "sexe", "taux_survie"]]

    # Fill gaps for years not in the pop file using fallback
    all_years = set(births_df["ANNAIS"].unique())
    covered = set(survival["annee_naissance"].unique())
    missing = all_years - covered
    if missing:
        print(f"   {len(missing)} cohortes sans données INSEE, fallback Gompertz")
        fallback_rows = []
        for year in missing:
            for sexe in ["1", "2"]:
                age = CURRENT_YEAR - year
                if age < 0:
                    taux = 1.0
                elif age > 120:
                    taux = 0.0
                else:
                    offset = 3 if sexe == "2" else 0
                    modal = 82 + offset
                    b = 0.095
                    taux = float(np.clip(
                        np.exp(-np.exp(b * (age - modal)) + np.exp(-b * modal)), 0, 1
                    ))
                fallback_rows.append({"annee_naissance": int(year), "sexe": sexe, "taux_survie": taux})
        survival = pd.concat([survival, pd.DataFrame(fallback_rows)], ignore_index=True)

    print(f"   {len(survival)} cohortes avec taux de survie")
    return survival



def load_deaths(known_prenoms):
    """Étape 4 — Vitesse d'extinction (Source B)

    known_prenoms: set of known compound prenoms from Source A (e.g. JEAN-PIERRE)
                   Used to reconstruct compound names from spaced format.
    """
    print("📊 Chargement des décès récents (Source B)...")
    files = sorted(glob.glob(str(DATA_DIR / "deces" / "deces-*.txt")))
    if not files:
        print("   ⚠️  Aucun fichier de décès trouvé, skip")
        return {}

    # Build lookup for compound prenoms: ("JEAN", "PIERRE") -> "JEAN-PIERRE"
    compound_lookup = {}
    for p in known_prenoms:
        if not isinstance(p, str):
            continue
        if "-" in p:
            parts = tuple(p.split("-"))
            if len(parts) == 2:
                compound_lookup[parts] = p

    def extract_prenom(line):
        """Extract first prenom, handling compound names (JEAN PIERRE -> JEAN-PIERRE)."""
        part = line[0:80].strip()
        if "*" not in part:
            return None
        after_star = part.split("*", 1)[1].strip()
        # Remove trailing slash
        if "/" in after_star:
            after_star = after_star.split("/")[0].strip()
        tokens = after_star.split()
        if not tokens:
            return None

        first = normalize_prenom(tokens[0])

        # If already hyphenated (JEAN-PIERRE), use as-is
        if "-" in first:
            return first if all(p.isalpha() for p in first.split("-")) else None

        # Try compound: check if first two tokens form a known compound prenom
        if len(tokens) >= 2:
            second = normalize_prenom(tokens[1])
            compound = compound_lookup.get((first, second))
            if compound:
                return compound

        return first if first.isalpha() else None

    counts = {}
    n_files = 0
    for path in files:
        basename = os.path.basename(path)
        # Use files from 2010+ (skip monthly files like deces-2025-m01.txt)
        try:
            parts = basename.replace(".txt", "").split("-")
            year = int(parts[1])
            if year < 2010 or len(parts) > 2:
                continue
        except (IndexError, ValueError):
            continue

        n_files += 1
        print(f"   Lecture de {basename}...")
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                if len(line) < 80:
                    continue
                try:
                    prenom = extract_prenom(line)
                    if prenom:
                        counts[prenom] = counts.get(prenom, 0) + 1
                except (IndexError, ValueError):
                    continue

    if n_files == 0:
        print("   ⚠️  Aucun fichier de décès trouvé, skip")
        return {}

    print(f"   {n_files} fichiers, {len(counts)} prénoms avec décès")
    return {p: v / n_files for p, v in counts.items()}


def load_rne():
    """Étape 5 — Répertoire National des Élus (Source D)"""
    print("📊 Chargement du RNE (Source D)...")
    rne_files = {
        "municipal": ["cm.csv", "maires.csv"],
        "intercommunal": ["epci.csv"],
        "departemental": ["cd.csv"],
        "regional": ["cr.csv"],
        "national": ["deputes.csv", "senateurs.csv"],
        "europeen": ["europeens.csv"],
    }

    frames = []
    for niveau, filenames in rne_files.items():
        for fname in filenames:
            path = DATA_DIR / "rne" / fname
            if not path.exists():
                print(f"   ⚠️  {fname} non trouvé, skip")
                continue
            try:
                df = pd.read_csv(path, sep=";", dtype=str, encoding="utf-8", on_bad_lines="skip")
                # Find the prenom column
                prenom_col = None
                for c in df.columns:
                    cl = c.lower().strip()
                    if "prénom" in cl or "prenom" in cl:
                        prenom_col = c
                        break
                if prenom_col is None:
                    print(f"   ⚠️  Pas de colonne prénom dans {fname}")
                    continue
                df = df.rename(columns={prenom_col: "prenom"})
                df["niveau"] = niveau
                df["prenom"] = df["prenom"].str.upper().str.strip()
                frames.append(df[["prenom", "niveau"]].dropna())
                print(f"   {fname}: {len(df)} élus")
            except Exception as e:
                print(f"   ⚠️  Erreur lecture {fname}: {e}")

    if not frames:
        print("   ⚠️  Aucun fichier RNE chargé")
        return pd.DataFrame(columns=["prenom", "niveau"]), 0

    rne = pd.concat(frames, ignore_index=True)
    print(f"   Total: {len(rne)} élus")
    return rne, len(rne)


def get_statut(vivants):
    if vivants < 1_000:
        return "🔴 En voie d'extinction"
    if vivants < 10_000:
        return "🟠 Menacé"
    if vivants < 50_000:
        return "🟡 Rare"
    return "🟢 Commun"


def build_courbe(prenom_births):
    """Build curve: births per decade + total people alive at each decade.

    'vivants' = total stock of living people with this name at mid-decade,
    accounting for all cohorts born up to that point and their survival.
    Uses Gompertz model for historical survival estimation.
    """
    decades = list(range(1900, 2030, 10))
    B = 0.095  # Gompertz aging rate

    # Pre-extract arrays for vectorized computation
    birth_years = prenom_births["ANNAIS"].values.astype(float)
    nombres = prenom_births["NOMBRE"].values.astype(float)
    sexes = prenom_births["SEXE"].values
    modals = np.where(sexes == "2", 85.0, 82.0)

    is_h = sexes == "1"
    is_f = sexes == "2"

    result = []
    for d in decades:
        ref_year = d + 5  # mid-decade

        # Naissances in this decade
        mask_decade = (birth_years >= d) & (birth_years < d + 10)
        naiss_h = int(nombres[mask_decade & is_h].sum())
        naiss_f = int(nombres[mask_decade & is_f].sum())

        # Total alive at ref_year: all cohorts born up to ref_year
        mask_born = birth_years <= ref_year
        ages = ref_year - birth_years[mask_born]
        m = modals[mask_born]
        n = nombres[mask_born]

        # Gompertz survival: P(survive to age a) = exp(-exp(B*(a-modal)) + exp(-B*modal))
        taux = np.exp(-np.exp(B * (ages - m)) + np.exp(-B * m))
        taux = np.clip(taux, 0.0, 1.0)
        taux[ages > 120] = 0.0
        taux[ages < 0] = 1.0

        vivants = int((n * taux).sum())

        result.append({
            "decade": f"{d}s",
            "naissances": naiss_h + naiss_f,
            "naissances_h": naiss_h,
            "naissances_f": naiss_f,
            "vivants": vivants,
        })
    return result


def compute_age_median(prenom_births):
    """Estimate the median age of living people with this prenom (Gompertz, vectorized)."""
    B = 0.095
    birth_years = prenom_births["ANNAIS"].values.astype(float)
    nombres = prenom_births["NOMBRE"].values.astype(float)
    sexes = prenom_births["SEXE"].values
    modals = np.where(sexes == "2", 85.0, 82.0)

    ages = CURRENT_YEAR - birth_years
    taux = np.exp(-np.exp(B * (ages - modals)) + np.exp(-B * modals))
    taux = np.clip(taux, 0.0, 1.0)
    taux[ages > 120] = 0.0
    taux[ages < 0] = 1.0

    vivants_est = nombres * taux
    total = vivants_est.sum()
    if total == 0:
        return None

    # Sort by age ascending for median computation
    order = np.argsort(ages)
    cumsum = np.cumsum(vivants_est[order])
    idx = np.searchsorted(cumsum, total / 2)
    return int(ages[order[min(idx, len(order) - 1)]])


def main():
    print("=" * 60)
    print("🏗️  build_stats.py — Génération de prenoms_stats.json")
    print("=" * 60)

    # Load all sources
    births = load_births()
    survival = load_survival(births)
    known_prenoms = set(births["PREUSUEL"].unique())
    recent_deaths = load_deaths(known_prenoms)
    rne, total_elus = load_rne()

    # Pre-compute RNE aggregates
    if len(rne) > 0:
        elus_by_prenom_niveau = rne.groupby(["prenom", "niveau"]).size().reset_index(name="n")
        elus_total = rne.groupby("prenom").size().reset_index(name="n_total")
        rne_niveaux = rne.groupby("niveau").size().to_dict()
    else:
        elus_by_prenom_niveau = pd.DataFrame(columns=["prenom", "niveau", "n"])
        elus_total = pd.DataFrame(columns=["prenom", "n_total"])
        rne_niveaux = {}

    # Build output
    print("\n📊 Calcul des statistiques par prénom...")
    output = {}
    grouped = births.groupby("PREUSUEL")
    total = len(grouped)

    for i, (prenom, group) in enumerate(grouped):
        if i % 500 == 0:
            print(f"   {i}/{total}...")

        # Vivants estimés
        merged = group.merge(
            survival,
            left_on=["ANNAIS", "SEXE"],
            right_on=["annee_naissance", "sexe"],
            how="left",
        )
        merged["taux_survie"] = merged["taux_survie"].fillna(0)
        vivants = int((merged["NOMBRE"] * merged["taux_survie"]).sum())

        # Décès par an
        deces_an = recent_deaths.get(prenom, 0)
        annee_ext = int(CURRENT_YEAR + vivants / deces_an) if deces_an > 0 else None

        # Élus
        nb_elus = int(elus_total.loc[elus_total["prenom"] == prenom, "n_total"].sum())

        # Quotient de pouvoir
        qp = None
        if vivants > 0 and nb_elus > 0 and total_elus > 0:
            qp = round((nb_elus / total_elus) / (vivants / POPULATION_FRANCE), 2)

        # QP par niveau
        qp_niv = {}
        for niveau, total_n in rne_niveaux.items():
            mask = (elus_by_prenom_niveau["prenom"] == prenom) & (
                elus_by_prenom_niveau["niveau"] == niveau
            )
            n = int(elus_by_prenom_niveau.loc[mask, "n"].sum())
            if vivants > 0 and n > 0 and total_n > 0:
                qp_niv[niveau] = round((n / total_n) / (vivants / POPULATION_FRANCE), 2)
            else:
                qp_niv[niveau] = 0

        # Sexe majoritaire + vivants par sexe
        sexe_sum = group.groupby("SEXE")["NOMBRE"].sum()
        sexe_maj = "M" if sexe_sum.idxmax() == "1" else "F"
        vivants_h = int((merged.loc[merged["SEXE"] == "1", "NOMBRE"] * merged.loc[merged["SEXE"] == "1", "taux_survie"]).sum())
        vivants_f = int((merged.loc[merged["SEXE"] == "2", "NOMBRE"] * merged.loc[merged["SEXE"] == "2", "taux_survie"]).sum())

        # Pic
        year_sum = group.groupby("ANNAIS")["NOMBRE"].sum()
        pic_annee = int(year_sum.idxmax())
        pic_naissances = int(year_sum.max())

        # Age médian
        age_median = compute_age_median(group)

        # Mixité: True if both genders > 10% of total births
        total_naiss = int(group["NOMBRE"].sum())
        naiss_h = int(sexe_sum.get("1", 0))
        naiss_f = int(sexe_sum.get("2", 0))
        mixte = total_naiss > 0 and min(naiss_h, naiss_f) / total_naiss > 0.1

        output[prenom] = {
            "vivants": vivants,
            "vivants_h": vivants_h,
            "vivants_f": vivants_f,
            "total_naissances": total_naiss,
            "deces_par_an": int(deces_an),
            "annee_extinction": annee_ext,
            "statut": get_statut(vivants),
            "sexe_majoritaire": sexe_maj,
            "mixte": mixte,
            "pic_annee": pic_annee,
            "pic_naissances": pic_naissances,
            "age_median": age_median,
            "quotient_pouvoir": qp,
            "qp_par_niveau": qp_niv,
            "nb_elus_total": nb_elus,
            "courbe": build_courbe(group),
        }

    # Write output
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    size_mb = os.path.getsize(OUTPUT) / (1024 * 1024)
    print(f"\n✅ {len(output)} prénoms exportés → {OUTPUT} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
