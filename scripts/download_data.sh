#!/bin/bash
# scripts/download_data.sh
# Télécharge les 4 sources de données nécessaires au calcul.
# Usage: bash scripts/download_data.sh
set -e
cd "$(dirname "$0")/.."
mkdir -p data/deces data/rne

echo "================================================"
echo "Telechargement des donnees — Combien il en reste ?"
echo "================================================"

# ─────────────────────────────────────────────────────
# Source A — Prénoms depuis 1900 (INSEE)
# ─────────────────────────────────────────────────────
echo ""
echo "[A] Prenoms INSEE (prenoms-2024-nat.csv)..."
curl -L "https://www.insee.fr/fr/statistiques/fichier/8595130/prenoms-2024-nat_csv.zip" \
  -o data/prenoms.zip
unzip -o data/prenoms.zip -d data/
rm -f data/prenoms.zip
echo "   Source A OK"

# ─────────────────────────────────────────────────────
# Source B — Fichier des personnes décédées 1970-2025
# URLs vérifiées sur data.gouv.fr le 24/03/2026
# ─────────────────────────────────────────────────────
echo ""
echo "[B] Deces 1970-2025 (INSEE)..."

dl_deces() {
  echo "   $1..."
  curl -L "$2" -o "data/deces/$1" || echo "   Echec $1"
}

dl_deces "deces-1970.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-182920/deces-1970.txt"
dl_deces "deces-1971.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-182944/deces-1971.txt"
dl_deces "deces-1972.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-183014/deces-1972.txt"
dl_deces "deces-1973.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-183046/deces-1973.txt"
dl_deces "deces-1974.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-183125/deces-1974.txt"
dl_deces "deces-1975.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-183159/deces-1975.txt"
dl_deces "deces-1976.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-183230/deces-1976.txt"
dl_deces "deces-1977.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-183343/deces-1977.txt"
dl_deces "deces-1978.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-183422/deces-1978.txt"
dl_deces "deces-1979.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-183455/deces-1979.txt"
dl_deces "deces-1980.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-184308/deces-1980.txt"
dl_deces "deces-1981.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-184352/deces-1981.txt"
dl_deces "deces-1982.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-184439/deces-1982.txt"
dl_deces "deces-1983.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-184521/deces-1983.txt"
dl_deces "deces-1984.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-184602/deces-1984.txt"
dl_deces "deces-1985.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-184643/deces-1985.txt"
dl_deces "deces-1986.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-184725/deces-1986.txt"
dl_deces "deces-1987.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-184806/deces-1987.txt"
dl_deces "deces-1988.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-184849/deces-1988.txt"
dl_deces "deces-1989.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-184929/deces-1989.txt"
dl_deces "deces-1990.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-185413/deces-1990.txt"
dl_deces "deces-1991.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-185459/deces-1991.txt"
dl_deces "deces-1992.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-185542/deces-1992.txt"
dl_deces "deces-1993.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-185630/deces-1993.txt"
dl_deces "deces-1994.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-185711/deces-1994.txt"
dl_deces "deces-1995.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-185755/deces-1995.txt"
dl_deces "deces-1996.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-185847/deces-1996.txt"
dl_deces "deces-1997.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-185942/deces-1997.txt"
dl_deces "deces-1998.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-190302/deces-1998.txt"
dl_deces "deces-1999.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-190038/deces-1999.txt"
dl_deces "deces-2000.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-190504/deces-2000.txt"
dl_deces "deces-2001.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-190558/deces-2001.txt"
dl_deces "deces-2002.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-190702/deces-2002.txt"
dl_deces "deces-2003.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-190755/deces-2003.txt"
dl_deces "deces-2004.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-190852/deces-2004.txt"
dl_deces "deces-2005.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-190939/deces-2005.txt"
dl_deces "deces-2006.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-191027/deces-2006.txt"
dl_deces "deces-2007.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-191117/deces-2007.txt"
dl_deces "deces-2008.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-191225/deces-2008.txt"
dl_deces "deces-2009.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-191359/deces-2009.txt"
dl_deces "deces-2010.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-191659/deces-2010.txt"
dl_deces "deces-2011.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-191745/deces-2011.txt"
dl_deces "deces-2012.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-191851/deces-2012.txt"
dl_deces "deces-2013.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-191938/deces-2013.txt"
dl_deces "deces-2014.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-192022/deces-2014.txt"
dl_deces "deces-2015.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-192119/deces-2015.txt"
dl_deces "deces-2016.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-192203/deces-2016.txt"
dl_deces "deces-2017.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191209-192304/deces-2017.txt"
dl_deces "deces-2018.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20191205-191652/deces-2018.txt"
dl_deces "deces-2019.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20200113-173945/deces-2019.txt"
dl_deces "deces-2020.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20210112-143457/deces-2020.txt"
dl_deces "deces-2021.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20220112-114131/deces-2021.txt"
dl_deces "deces-2022.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20230209-094802/deces-2022.txt"
dl_deces "deces-2023.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20240219-094712/deces-2023.txt"
dl_deces "deces-2024.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20250210-094840/deces-2024.txt"
dl_deces "deces-2025.txt" "https://static.data.gouv.fr/resources/fichier-des-personnes-decedees/20260106-124733/deces-2025.txt"

echo "   Source B OK"

# ─────────────────────────────────────────────────────
# Source C — Pyramide des âges détaillée (INSEE)
# ─────────────────────────────────────────────────────
echo ""
echo "[C] Pyramide des ages detaillee 2026 (INSEE)..."
curl -L "https://www.insee.fr/fr/statistiques/fichier/8721185/3_Pop1janv_age.xlsx" \
  -o data/pop_age_2026.xlsx
echo "   Source C OK"

# ─────────────────────────────────────────────────────
# Source D — Répertoire National des Élus (Ministère de l'Intérieur)
# URLs vérifiées sur data.gouv.fr le 24/03/2026
# ─────────────────────────────────────────────────────
echo ""
echo "[D] Repertoire National des Elus..."

dl_rne() {
  echo "   $1..."
  curl -L "$2" -o "data/rne/$1" || echo "   Echec $1"
}

dl_rne "cm.csv"         "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/20251223-103336/elus-conseillers-municipaux-cm.csv"
dl_rne "maires.csv"     "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/20251223-104211/elus-maires-mai.csv"
dl_rne "epci.csv"       "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/20251223-103622/elus-conseillers-communautaires-epci.csv"
dl_rne "cd.csv"         "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/20251223-103735/elus-conseillers-departementaux-cd.csv"
dl_rne "cr.csv"         "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/20251223-103814/elus-conseillers-regionaux-cr.csv"
dl_rne "deputes.csv"    "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/20251223-104106/elus-deputes-dep.csv"
dl_rne "senateurs.csv"  "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/20251223-104017/elus-senateurs-sen.csv"
dl_rne "europeens.csv"  "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/20251223-103935/elus-representants-parlement-europeen-rpe.csv"

echo "   Source D OK"

echo ""
echo "================================================"
echo "Telechargement termine."
echo ""
echo "Prochaine etape :"
echo "  python scripts/build_stats.py"
echo "================================================"
