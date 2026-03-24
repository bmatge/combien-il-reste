import { useState, useCallback } from 'react'

function getLongevityLabel(ageDeces, ageMedian) {
  if (ageMedian == null || ageDeces == null) return null
  const diff = ageDeces - ageMedian
  if (diff <= -15) return { text: 'Parti trop tôt', color: 'text-rouge' }
  if (diff <= -5)  return { text: 'Parti tôt', color: 'text-orange' }
  if (diff >= 15)  return { text: 'Doyen', color: 'text-vert' }
  if (diff >= 5)   return { text: 'Belle longévité', color: 'text-bleu' }
  return { text: 'Dans la moyenne', color: 'text-gris' }
}

/**
 * Check if an image is a grey/uniform placeholder by sampling pixels.
 * Returns true if the image is mostly a single flat color (low variance).
 */
function isPlaceholderImage(img) {
  try {
    const canvas = document.createElement('canvas')
    const size = 32
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, size, size)
    const { data } = ctx.getImageData(0, 0, size, size)

    let sumR = 0, sumG = 0, sumB = 0
    const n = size * size
    for (let i = 0; i < data.length; i += 4) {
      sumR += data[i]
      sumG += data[i + 1]
      sumB += data[i + 2]
    }
    const avgR = sumR / n, avgG = sumG / n, avgB = sumB / n

    // Check if it's greyish (R≈G≈B) and low variance
    const isGrey = Math.abs(avgR - avgG) < 15 && Math.abs(avgG - avgB) < 15
    if (!isGrey) return false

    let variance = 0
    for (let i = 0; i < data.length; i += 4) {
      variance += (data[i] - avgR) ** 2
    }
    variance /= n

    // Low variance = uniform color = placeholder
    return variance < 300
  } catch {
    return false
  }
}

function CelebImage({ src, alt }) {
  const [hidden, setHidden] = useState(false)

  const onLoad = useCallback((e) => {
    if (isPlaceholderImage(e.target)) {
      setHidden(true)
    }
  }, [])

  if (hidden || !src) {
    return (
      <div className="w-10 h-10 rounded-full bg-gris-clair flex items-center justify-center text-sm shrink-0">
        <span className="text-gris font-bold">{alt?.charAt(0) || '?'}</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      crossOrigin="anonymous"
      onLoad={onLoad}
      onError={() => setHidden(true)}
      className="w-10 h-10 rounded-full object-cover bg-gris-clair shrink-0"
      loading="lazy"
    />
  )
}

export default function Celebrites({ celebrites, ageMedian }) {
  const [showAll, setShowAll] = useState(false)
  if (!celebrites || celebrites.length === 0) return null

  const visible = showAll ? celebrites : celebrites.slice(0, 6)
  const hasMore = celebrites.length > 6

  return (
    <div className="px-5 py-5">
      <h3 className="text-sm font-semibold text-gris uppercase tracking-wide mb-0.5">
        Ils nous ont quittés
      </h3>
      {ageMedian != null && (
        <p className="text-xs text-gris mb-3">
          Comparé à l'âge médian des {ageMedian} ans du prénom.
        </p>
      )}
      <div className="space-y-2.5">
        {visible.map((c, i) => {
          const label = getLongevityLabel(c.age_deces, ageMedian)
          return (
            <div key={i} className="flex items-center gap-3">
              <CelebImage
                src={c.image ? `/celebrites/${c.image}` : null}
                alt={c.nom_complet}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-noir leading-tight truncate">
                  {c.nom_complet}
                </p>
                <p className="text-xs text-gris leading-tight">
                  {c.categorie && <span>{c.categorie} · </span>}
                  {c.age_deces && <span>{c.age_deces} ans · </span>}
                  {c.annee_naissance}–{c.annee_deces}
                </p>
              </div>
              {label && (
                <span className={`text-xs font-medium whitespace-nowrap ${label.color}`}>
                  {label.text}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-xs text-bleu hover:underline cursor-pointer"
        >
          + {celebrites.length - 6} autres
        </button>
      )}
    </div>
  )
}
