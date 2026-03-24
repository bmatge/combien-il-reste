# 💀 Combien il en reste ?

> **Vous connaissez un Gérard ? Profitez-en. Il n'en reste plus beaucoup.**

App web qui répond à la question que personne ne se posait : *combien de porteurs d'un prénom sont encore en vie en France aujourd'hui ?*

Croisement du fichier des naissances INSEE depuis 1900, des estimations de population officielles, du fichier des personnes décédées et du Répertoire National des Élus.

Résultat : vous tapez **YVETTE**, vous apprenez qu'il en reste 87 000, qu'elles disparaissent à raison de 4 400 par an, et que la dernière Yvette est attendue vers 2045.

100% données officielles de la République française. Licence Ouverte v2.

---

## Stack technique

- **Frontend** : React + Vite + Tailwind CSS + Recharts
- **Backend** : API serverless (Vercel) + SQLite (better-sqlite3)
- **Données** : 4 sources INSEE/Intérieur pré-traitées dans une base SQLite

## Architecture

```
combien-il-reste/
├── api/
│   └── prenom.js               # API Vercel serverless
├── scripts/
│   ├── download_data.sh         # Téléchargement des 4 sources
│   ├── build_db.py              # Construction de la base SQLite
│   └── dev-api.js               # Serveur API local (dev)
├── data/                        # Données brutes (.gitignore)
│   ├── prenoms-2024-nat.csv     # Source A
│   ├── pop_age_2026.xlsx        # Source C
│   ├── deces/                   # Source B (1970-2025)
│   ├── rne/                     # Source D
│   ├── celebrities/             # Personnalités décédées
│   └── prenoms.db               # Base SQLite générée
├── public/
│   └── celebrites/              # Photos des personnalités
├── src/
│   ├── App.jsx                  # Routing + layout principal
│   ├── components/
│   │   ├── SearchBar.jsx        # Autocomplete (appel API)
│   │   ├── ResultCard.jsx       # Fiche résultat complète
│   │   ├── ExtinctionChart.jsx  # Courbe naissances vs population
│   │   ├── PouvoirMeter.jsx     # Jauge Quotient de Pouvoir
│   │   ├── PouvoirBreakdown.jsx # Détail QP par niveau de mandat
│   │   ├── Celebrites.jsx       # Personnalités décédées
│   │   ├── StatusBadge.jsx      # Badge Commun/Rare/Menacé/Extinction
│   │   ├── EasterEgg.jsx        # Messages easter eggs
│   │   └── Methode.jsx          # Modal disclaimers
│   ├── pages/
│   │   └── Quiz.jsx             # Quiz multijoueur
│   └── utils/
│       ├── prenomUtils.js       # Normalisation, recherche, formatage
│       └── easterEggs.js        # Définition des easter eggs
├── vercel.json                  # Config déploiement Vercel
└── package.json
```

## Sources de données

| Source | Description | Taille | Fréquence |
|--------|------------|--------|-----------|
| **A** — [Prénoms depuis 1900](https://www.data.gouv.fr/datasets/fichier-des-prenoms-depuis-1900) | Naissances par prénom, sexe, année (1900-2024) | ~13 Mo | Annuelle |
| **B** — [Fichier des personnes décédées](https://www.data.gouv.fr/datasets/fichier-des-personnes-decedees) | Décès individuels avec prénom, dates, lieu (1970-2025) | ~5 Go | Mensuelle |
| **C** — [Estimations de population](https://www.insee.fr/fr/statistiques/8721185) | Pyramide des âges par année de naissance et sexe (2026) | ~800 Ko | Annuelle |
| **D** — [Répertoire National des Élus](https://www.data.gouv.fr/datasets/repertoire-national-des-elus-1) | ~590 000 élus avec prénom et niveau de mandat | ~75 Mo | Trimestrielle |
| **E** — Personnalités décédées | 1 120 personnalités françaises avec photos (2000-2026) | ~14 Mo | Manuelle |

## Logique de calcul

### Vivants estimés
```
taux_survie(année, sexe) = population_INSEE_2026(année, sexe) / naissances_totales(année, sexe)
vivants(PRENOM) = Σ naissances(PRENOM, année, sexe) × taux_survie(année, sexe)
```

### Vitesse d'extinction
Moyenne annuelle des décès sur 2020-2025 (fichier des personnes décédées).

### Année d'extinction
```
année_extinction = 2026 + vivants / décès_par_an
```
Pour les prénoms jeunes (extinction > 2226), affichage "Extinction lointaine" avec disclaimer.

### Quotient de Pouvoir
```
QP = (nb_élus_prénom / total_élus) / (vivants_prénom / population_France)
```
Un QP de 2 = ce prénom est 2× plus représenté chez les élus que dans la population.

### Courbe population
Pour chaque décennie (1900s-2020s), estimation du stock total de porteurs vivants à cette époque via un modèle de survie Gompertz.

## Base SQLite

Tables :
- `naissances` (prenom, sexe, annee, nombre)
- `survie` (annee_naissance, sexe, taux_survie)
- `deces_par_an` (prenom, annee_deces, nombre, somme_ages)
- `deces_par_age` (prenom, age_deces, nombre)
- `elus` (prenom, niveau, nombre)
- `celebrites` (prenom, nom_complet, categorie, annee_naissance, annee_deces, age_deces, image)

Le script `build_db.py` supporte le rebuild incrémental :
```bash
python scripts/build_db.py celebrites     # rebuild une seule table
python scripts/build_db.py elus celebrites # rebuild plusieurs tables
python scripts/build_db.py                 # auto-détecte les tables manquantes
python scripts/build_db.py --full          # full rebuild
```

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/prenom?q=BERNARD` | Stats complètes pour un prénom |
| `GET /api/prenom?search=BER` | Autocomplete (8 résultats max) |

Réponse `?q=` :
```json
{
  "prenom": "BERNARD",
  "vivants": 268089,
  "total_naissances": 379670,
  "deces_par_an": 6940,
  "annee_extinction": 2064,
  "statut": "🟢 Commun",
  "age_median": 72,
  "age_moyen_deces": 81,
  "quotient_pouvoir": 2.49,
  "nb_elus_total": 5821,
  "qp_par_niveau": { "municipal": 2.3, "national": 3.1, ... },
  "courbe": [ { "decade": "1900s", "naissances": 1200, "vivants": 1200 }, ... ],
  "celebrites": [ { "nom_complet": "Bernard Blier", "categorie": "Acteurs", ... } ],
  ...
}
```

## Installation

### Prérequis
- Node.js 18+
- Python 3.9+ avec pandas, numpy, openpyxl
- ~6 Go d'espace disque (données brutes)

### Setup
```bash
# 1. Installer les dépendances
npm install
pip install pandas numpy openpyxl

# 2. Télécharger les données (~5 Go, ~30 min)
bash scripts/download_data.sh

# 3. Construire la base SQLite (~20 min pour le full build)
python scripts/build_db.py --full

# 4. Extraire les images célébrités
unzip data/celebrities/images_celebrites_francaises.zip -d public/celebrites/

# 5. Lancer en dev
npm run dev
```

### Commandes
```bash
npm run dev          # API + Vite en parallèle (dev local)
npm run dev:api      # API seule (port 3001)
npm run dev:front    # Vite seul (port 5173)
npm run build        # Build production
npm run build:db     # Alias pour python scripts/build_db.py
```

## Déploiement (Vercel)

Le projet est configuré pour Vercel :
- Le frontend est buildé par Vite
- `api/prenom.js` est déployé comme serverless function
- `data/prenoms.db` est inclus dans le bundle serverless (via `vercel.json`)

```bash
vercel deploy
```

## Quiz

Accessible via `/quiz`. Mode multijoueur avec 3 types de questions :
1. **"Combien il en reste ?"** — estimation libre, scoring logarithmique (0-1000 pts)
2. **"En quelle année est mort(e) X ?"** — QCM, données célébrités
3. **"À quel âge est décédé(e) X ?"** — QCM, données célébrités

## Easter eggs

| Prénom | Réaction |
|--------|----------|
| CLAUDE | "Claude est un prénom épicène — et visiblement immortel." |
| KEVIN | "Les Kevin ont encore 70 ans devant eux. Patience." |
| YVETTE | Alerte espèce en danger critique (badge clignotant) |
| Prénom < 1 000 vivants | "Prénom en voie d'extinction — signalez-le à l'INSEE." |
| Prénom > 100 000 + 0 élu | "La République ne vous a pas encore trouvés." |
| Prénom pic > 2015 | "Il est trop tôt pour s'inquiéter. Revenez en 2090." |

## Biais et limites

- Les naissances < 20 occurrences/an sont regroupées par l'INSEE
- L'état civil est partiellement exhaustif avant 1946
- Les décès à l'étranger sont partiellement couverts
- Le fichier des naissances ne recense que les naissances en France (pas l'immigration)
- Les prénoms composés (JEAN-PIERRE) sont reconstitués à partir du fichier des décès

## Licence

- **Code** : MIT
- **Données** : Licence Ouverte v2.0 (Etalab)
