import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'prenoms.db')

let db
function getDb() {
  if (!db) {
    console.log(`Opening database: ${DB_PATH}`)
    db = new Database(DB_PATH, { readonly: true, fileMustExist: true })
    db.pragma('cache_size = -64000') // 64MB cache
    console.log(`Database opened successfully`)
  }
  return db
}

// Gompertz survival model
function gompertzSurvival(age, sexe) {
  if (age < 0) return 1
  if (age > 120) return 0
  const modal = sexe === '2' ? 85 : 82
  const B = 0.095
  return Math.max(0, Math.min(1, Math.exp(-Math.exp(B * (age - modal)) + Math.exp(-B * modal))))
}

function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

function computeStats(prenom) {
  const conn = getDb()
  const CURRENT_YEAR = 2026

  // 1. Naissances
  const naissances = conn
    .prepare('SELECT sexe, annee, nombre FROM naissances WHERE prenom = ?')
    .all(prenom)

  if (naissances.length === 0) return null

  // 2. Survie rates
  const survieRows = conn
    .prepare('SELECT annee_naissance, sexe, taux_survie FROM survie')
    .all()
  const survieMap = {}
  for (const r of survieRows) {
    survieMap[`${r.annee_naissance}_${r.sexe}`] = r.taux_survie
  }

  // 3. Compute vivants
  let vivants = 0
  let vivants_h = 0
  let vivants_f = 0
  let totalNaissances = 0
  let naissH = 0
  let naissF = 0
  const yearSums = {}

  for (const row of naissances) {
    totalNaissances += row.nombre
    if (row.sexe === '1') naissH += row.nombre
    else naissF += row.nombre
    yearSums[row.annee] = (yearSums[row.annee] || 0) + row.nombre

    const taux = survieMap[`${row.annee}_${row.sexe}`]
    const v = taux != null
      ? row.nombre * taux
      : row.nombre * gompertzSurvival(CURRENT_YEAR - row.annee, row.sexe)
    vivants += v
    if (row.sexe === '1') vivants_h += v
    else vivants_f += v
  }
  vivants = Math.round(vivants)
  vivants_h = Math.round(vivants_h)
  vivants_f = Math.round(vivants_f)

  // Pic
  let picAnnee = 0
  let picNaissances = 0
  for (const [y, n] of Object.entries(yearSums)) {
    if (n > picNaissances) {
      picNaissances = n
      picAnnee = parseInt(y)
    }
  }

  // Sexe majoritaire
  const sexeMaj = naissH >= naissF ? 'M' : 'F'
  const mixte = totalNaissances > 0 && Math.min(naissH, naissF) / totalNaissances > 0.1

  // 4. Décès
  const decesRecent = conn
    .prepare('SELECT SUM(nombre) as total FROM deces_par_an WHERE prenom = ? AND annee_deces >= 2020')
    .get(prenom)
  const nbAnneesRecentes = conn
    .prepare('SELECT COUNT(DISTINCT annee_deces) as n FROM deces_par_an WHERE prenom = ? AND annee_deces >= 2020')
    .get(prenom)
  const decesParAn = nbAnneesRecentes?.n > 0
    ? Math.round((decesRecent?.total || 0) / nbAnneesRecentes.n)
    : 0

  const anneeExtinction = decesParAn > 0 ? CURRENT_YEAR + Math.round(vivants / decesParAn) : null

  // Age moyen au décès (toutes années)
  const ageMoyen = conn
    .prepare('SELECT SUM(somme_ages) as sa, SUM(nombre) as n FROM deces_par_an WHERE prenom = ?')
    .get(prenom)
  const ageMoyenDeces = ageMoyen?.n > 0 ? Math.round(ageMoyen.sa / ageMoyen.n) : null

  // Distribution d'âge au décès (tranches de 10 ans)
  const ageDistrib = conn
    .prepare(`
      SELECT
        CASE
          WHEN age_deces < 10 THEN '0-9'
          WHEN age_deces < 20 THEN '10-19'
          WHEN age_deces < 30 THEN '20-29'
          WHEN age_deces < 40 THEN '30-39'
          WHEN age_deces < 50 THEN '40-49'
          WHEN age_deces < 60 THEN '50-59'
          WHEN age_deces < 70 THEN '60-69'
          WHEN age_deces < 80 THEN '70-79'
          WHEN age_deces < 90 THEN '80-89'
          WHEN age_deces < 100 THEN '90-99'
          ELSE '100+'
        END as tranche,
        SUM(nombre) as total
      FROM deces_par_age
      WHERE prenom = ?
      GROUP BY tranche
      ORDER BY MIN(age_deces)
    `)
    .all(prenom)

  // 5. Élus / Quotient de Pouvoir
  const meta = {}
  for (const r of conn.prepare('SELECT key, value FROM meta').all()) {
    meta[r.key] = r.value
  }
  const totalElus = parseInt(meta.total_elus || '0')
  const popFrance = parseInt(meta.population_france || '68000000')

  const elusRows = conn
    .prepare('SELECT niveau, nombre FROM elus WHERE prenom = ?')
    .all(prenom)
  const nbElusTotal = elusRows.reduce((s, r) => s + r.nombre, 0)

  let qp = null
  if (vivants > 0 && nbElusTotal > 0 && totalElus > 0) {
    qp = Math.round(((nbElusTotal / totalElus) / (vivants / popFrance)) * 100) / 100
  }

  const qpParNiveau = {}
  const niveauTotals = {}
  for (const r of conn.prepare('SELECT niveau, SUM(nombre) as total FROM elus GROUP BY niveau').all()) {
    niveauTotals[r.niveau] = r.total
  }
  for (const r of elusRows) {
    const nt = niveauTotals[r.niveau] || 1
    if (vivants > 0) {
      qpParNiveau[r.niveau] = Math.round(((r.nombre / nt) / (vivants / popFrance)) * 100) / 100
    }
  }

  // 6. Courbe: naissances par décennie + population vivante à cette époque
  const courbe = []
  for (let d = 1900; d < 2030; d += 10) {
    const refYear = d + 5
    let naissDecennie = 0
    let naissDecennieH = 0
    let naissDecennieF = 0
    let popVivante = 0

    for (const row of naissances) {
      // Naissances this decade
      if (row.annee >= d && row.annee < d + 10) {
        naissDecennie += row.nombre
        if (row.sexe === '1') naissDecennieH += row.nombre
        else naissDecennieF += row.nombre
      }
      // Population alive at mid-decade
      if (row.annee <= refYear) {
        const age = refYear - row.annee
        popVivante += row.nombre * gompertzSurvival(age, row.sexe)
      }
    }

    courbe.push({
      decade: `${d}s`,
      naissances: naissDecennie,
      naissances_h: naissDecennieH,
      naissances_f: naissDecennieF,
      vivants: Math.round(popVivante),
    })
  }

  // 7. Statut — takes trend into account, not just absolute count
  // Recent births (last 10 years) vs. peak
  const recentYears = Object.entries(yearSums)
    .filter(([y]) => parseInt(y) >= CURRENT_YEAR - 10)
  const recentBirths = recentYears.reduce((s, [, n]) => s + n, 0)
  const avgRecentBirths = recentYears.length > 0 ? recentBirths / recentYears.length : 0
  const isGrowing = avgRecentBirths > 5 // Still being given to kids

  let statut
  if (vivants < 1000 && !isGrowing) statut = "🔴 En voie d'extinction"
  else if (vivants < 1000 && isGrowing) statut = '🟡 Rare'
  else if (vivants < 10000 && !isGrowing) statut = '🟠 Menacé'
  else if (vivants < 10000) statut = '🟡 Rare'
  else if (vivants < 50000) statut = '🟡 Rare'
  else statut = '🟢 Commun'

  // 8. Âge médian (Gompertz)
  const vivantsParAge = []
  for (const row of naissances) {
    const age = CURRENT_YEAR - row.annee
    const taux = survieMap[`${row.annee}_${row.sexe}`]
      ?? gompertzSurvival(age, row.sexe)
    vivantsParAge.push({ age, vivants: row.nombre * taux })
  }
  vivantsParAge.sort((a, b) => a.age - b.age)
  const totalVivEst = vivantsParAge.reduce((s, r) => s + r.vivants, 0)
  let cumul = 0
  let ageMedian = null
  for (const r of vivantsParAge) {
    cumul += r.vivants
    if (cumul >= totalVivEst / 2) {
      ageMedian = r.age
      break
    }
  }

  return {
    vivants,
    vivants_h,
    vivants_f,
    total_naissances: totalNaissances,
    deces_par_an: decesParAn,
    annee_extinction: anneeExtinction,
    statut,
    sexe_majoritaire: sexeMaj,
    mixte,
    pic_annee: picAnnee,
    pic_naissances: picNaissances,
    age_median: ageMedian,
    age_moyen_deces: ageMoyenDeces,
    age_distrib_deces: ageDistrib,
    quotient_pouvoir: qp,
    qp_par_niveau: qpParNiveau,
    nb_elus_total: nbElusTotal,
    courbe,
    celebrites: getCelebrites(prenom),
  }
}

function getCelebrites(prenom) {
  const conn = getDb()
  return conn
    .prepare(`
      SELECT nom_complet, categorie, annee_naissance, annee_deces, age_deces, image
      FROM celebrites
      WHERE prenom = ?
      ORDER BY annee_deces DESC
      LIMIT 12
    `)
    .all(prenom)
}

// Autocomplete endpoint
function searchPrenoms(query, limit = 8) {
  const conn = getDb()
  const norm = normalize(query)
  if (norm.length < 1) return []

  const results = conn
    .prepare(`
      SELECT prenom, SUM(nombre) as total
      FROM naissances
      WHERE prenom LIKE ? || '%'
      GROUP BY prenom
      ORDER BY
        CASE WHEN prenom = ? THEN 0 WHEN prenom LIKE ? || '%' THEN 1 ELSE 2 END,
        total DESC
      LIMIT ?
    `)
    .all(norm, norm, norm, limit)

  return results.map(r => r.prenom)
}

export default function handler(req, res) {
  const { q, search } = req.query

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')

  try {
    if (search) {
      const results = searchPrenoms(search)
      return res.status(200).json(results)
    }

    if (!q) {
      return res.status(400).json({ error: 'Missing ?q=PRENOM parameter' })
    }

    const prenom = normalize(q)
    const stats = computeStats(prenom)

    if (!stats) {
      return res.status(404).json({ error: 'Prénom non trouvé', prenom })
    }

    return res.status(200).json({ prenom, ...stats })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal error', message: err.message })
  }
}
