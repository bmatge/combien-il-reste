/**
 * Normalize a string: remove accents, uppercase, trim
 */
export function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

/**
 * Search prenoms matching a query (prefix match, accent-insensitive)
 */
export function searchPrenoms(query, prenomKeys, limit = 8) {
  if (!query || query.length < 1) return []
  const norm = normalize(query)
  const exact = []
  const startsWith = []
  const contains = []

  for (const key of prenomKeys) {
    if (key === norm) {
      exact.push(key)
    } else if (key.startsWith(norm)) {
      startsWith.push(key)
    } else if (key.includes(norm)) {
      contains.push(key)
    }
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit)
}

/**
 * Format a number with French locale (spaces as thousands separator)
 */
export function formatNumber(n) {
  if (n == null) return '—'
  return Math.round(n).toLocaleString('fr-FR')
}

/**
 * Display prenom in title case: JEAN-PIERRE → Jean-Pierre
 */
export function titleCase(str) {
  return str
    .toLowerCase()
    .replace(/(^|[-' ])(\w)/g, (_, sep, c) => sep + c.toUpperCase())
}
