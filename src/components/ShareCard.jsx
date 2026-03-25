import { useRef, useCallback, useState } from 'react'
import { titleCase, formatNumber } from '../utils/prenomUtils'

const COLORS = {
  noir: '#1a1a2e',
  creme: '#faf9f6',
  gris: '#6b7280',
  grisClair: '#e5e7eb',
  blanc: '#ffffff',
  vert: '#16a34a',
  vertClair: '#dcfce7',
  rouge: '#dc2626',
  rougeClair: '#fee2e2',
  orange: '#ea580c',
  orangeClair: '#fff7ed',
  ambre: '#d97706',
  ambreClair: '#fef3c7',
}

const STATUS_COLORS = {
  "En voie d'extinction": { bg: COLORS.rougeClair, text: COLORS.rouge, dot: COLORS.rouge },
  'Menacé': { bg: COLORS.orangeClair, text: COLORS.orange, dot: COLORS.orange },
  'Rare': { bg: COLORS.ambreClair, text: COLORS.ambre, dot: COLORS.ambre },
  'Commun': { bg: COLORS.vertClair, text: COLORS.vert, dot: COLORS.vert },
}

function getStatusLabel(statut) {
  return statut.replace(/^[^\w\s]*\s*/, '').replace(/^(🔴|🟠|🟡|🟢)\s*/, '')
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawBadge(ctx, label, x, y, colors) {
  ctx.font = '600 24px Inter, system-ui, sans-serif'
  const tw = ctx.measureText(label).width
  const pw = 20, ph = 6, r = 18
  const bw = tw + pw * 2 + 16 // dot + gap + text + padding

  drawRoundRect(ctx, x, y, bw, 36, r)
  ctx.fillStyle = colors.bg
  ctx.fill()

  // Dot
  ctx.beginPath()
  ctx.arc(x + pw + 5, y + 18, 5, 0, Math.PI * 2)
  ctx.fillStyle = colors.dot
  ctx.fill()

  // Text
  ctx.fillStyle = colors.text
  ctx.fillText(label, x + pw + 16, y + 25)

  return bw
}

function drawCard(canvas, data, prenom, format) {
  const isSquare = format === 'square'
  const W = isSquare ? 1080 : 1200
  const H = isSquare ? 1080 : 630
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = COLORS.creme
  ctx.fillRect(0, 0, W, H)

  // Card
  const margin = isSquare ? 60 : 50
  const cardX = margin, cardY = margin
  const cardW = W - margin * 2, cardH = H - margin * 2
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 32)
  ctx.fillStyle = COLORS.blanc
  ctx.fill()
  ctx.strokeStyle = COLORS.grisClair
  ctx.lineWidth = 2
  ctx.stroke()

  const cx = W / 2 // center x

  if (isSquare) {
    // --- SQUARE (Instagram) ---
    // Skull icon placeholder + title
    ctx.font = '900 28px Inter, system-ui, sans-serif'
    ctx.fillStyle = COLORS.gris
    ctx.textAlign = 'center'
    ctx.fillText('COMBIEN IL EN RESTE ?', cx, cardY + 70)

    // Prenom
    ctx.font = '900 96px Inter, system-ui, sans-serif'
    ctx.fillStyle = COLORS.noir
    ctx.fillText(titleCase(prenom), cx, cardY + 210)

    // Badge
    const statusLabel = getStatusLabel(data.statut)
    const sc = STATUS_COLORS[statusLabel] || STATUS_COLORS['Commun']
    ctx.textAlign = 'left'
    const badgeW = (() => {
      ctx.font = '600 24px Inter, system-ui, sans-serif'
      return ctx.measureText(statusLabel).width + 56
    })()
    drawBadge(ctx, statusLabel, cx - badgeW / 2, cardY + 235, sc)

    // Big number
    ctx.textAlign = 'center'
    ctx.font = '900 120px Inter, system-ui, sans-serif'
    ctx.fillStyle = COLORS.noir
    ctx.fillText(formatNumber(data.vivants), cx, cardY + 430)

    // "en vie en France"
    ctx.font = '500 32px Inter, system-ui, sans-serif'
    ctx.fillStyle = COLORS.gris
    ctx.fillText('en vie en France', cx, cardY + 475)

    // Separator
    ctx.beginPath()
    ctx.moveTo(cardX + 80, cardY + 520)
    ctx.lineTo(cardX + cardW - 80, cardY + 520)
    ctx.strokeStyle = COLORS.grisClair
    ctx.lineWidth = 2
    ctx.stroke()

    // Stats row
    const stats = []
    if (data.age_median != null) stats.push({ label: 'Âge médian', value: `${data.age_median} ans` })
    if (data.pic_annee) stats.push({ label: 'Pic', value: `${data.pic_annee}` })
    if (data.total_naissances > 0) stats.push({ label: 'Naissances', value: formatNumber(data.total_naissances) })

    const survivalRate = data.total_naissances > 0
      ? Math.round((data.vivants / data.total_naissances) * 100)
      : null
    if (survivalRate != null) stats.push({ label: 'Taux de survie', value: `${survivalRate} %` })
    if (data.deces_par_an > 0) stats.push({ label: 'Décès/an', value: `~${formatNumber(data.deces_par_an)}` })

    const visibleStats = stats.slice(0, 4)
    const colW = cardW / visibleStats.length
    visibleStats.forEach((s, i) => {
      const sx = cardX + colW * i + colW / 2
      ctx.font = '500 22px Inter, system-ui, sans-serif'
      ctx.fillStyle = COLORS.gris
      ctx.textAlign = 'center'
      ctx.fillText(s.label, sx, cardY + 580)
      ctx.font = '800 34px Inter, system-ui, sans-serif'
      ctx.fillStyle = COLORS.noir
      ctx.fillText(s.value, sx, cardY + 620)
    })

    // Footer
    ctx.font = '500 22px Inter, system-ui, sans-serif'
    ctx.fillStyle = COLORS.gris
    ctx.textAlign = 'center'
    ctx.fillText('Combien il en reste ? · Estimation statistique', cx, cardY + cardH - 30)

  } else {
    // --- LANDSCAPE (Twitter / OG) ---
    // Left side
    const leftX = cardX + 60
    const rightBound = cx + 40

    // Small title
    ctx.font = '800 22px Inter, system-ui, sans-serif'
    ctx.fillStyle = COLORS.gris
    ctx.textAlign = 'left'
    ctx.fillText('COMBIEN IL EN RESTE ?', leftX, cardY + 60)

    // Prenom
    ctx.font = '900 72px Inter, system-ui, sans-serif'
    ctx.fillStyle = COLORS.noir
    ctx.fillText(titleCase(prenom), leftX, cardY + 145)

    // Badge
    const statusLabel = getStatusLabel(data.statut)
    const sc = STATUS_COLORS[statusLabel] || STATUS_COLORS['Commun']
    drawBadge(ctx, statusLabel, leftX, cardY + 165, sc)

    // Big number
    ctx.font = '900 100px Inter, system-ui, sans-serif'
    ctx.fillStyle = COLORS.noir
    ctx.textAlign = 'left'
    ctx.fillText(formatNumber(data.vivants), leftX, cardY + 310)

    ctx.font = '500 28px Inter, system-ui, sans-serif'
    ctx.fillStyle = COLORS.gris
    ctx.fillText('en vie en France', leftX, cardY + 350)

    // Footer
    ctx.font = '500 20px Inter, system-ui, sans-serif'
    ctx.fillStyle = COLORS.gris
    ctx.textAlign = 'left'
    ctx.fillText('Combien il en reste ? · Estimation statistique', leftX, cardY + cardH - 30)

    // Right side — stats
    const rsX = cx + 80
    ctx.beginPath()
    ctx.moveTo(cx + 40, cardY + 40)
    ctx.lineTo(cx + 40, cardY + cardH - 40)
    ctx.strokeStyle = COLORS.grisClair
    ctx.lineWidth = 2
    ctx.stroke()

    const stats = []
    if (data.age_median != null) stats.push({ label: 'Âge médian', value: `${data.age_median} ans` })
    if (data.pic_annee) stats.push({ label: 'Pic de naissances', value: `${data.pic_annee}` })
    if (data.total_naissances > 0) stats.push({ label: 'Naissances depuis 1900', value: formatNumber(data.total_naissances) })

    const survivalRate = data.total_naissances > 0
      ? Math.round((data.vivants / data.total_naissances) * 100)
      : null
    if (survivalRate != null) stats.push({ label: 'Taux de survie', value: `${survivalRate} %` })
    if (data.deces_par_an > 0) stats.push({ label: 'Décès par an', value: `~${formatNumber(data.deces_par_an)}` })
    if (data.annee_extinction && data.annee_extinction <= 2226)
      stats.push({ label: 'Extinction estimée', value: `~${data.annee_extinction}` })

    const visibleStats = stats.slice(0, 6)
    const rowH = (cardH - 80) / visibleStats.length
    visibleStats.forEach((s, i) => {
      const sy = cardY + 50 + rowH * i + rowH / 2
      ctx.font = '500 22px Inter, system-ui, sans-serif'
      ctx.fillStyle = COLORS.gris
      ctx.textAlign = 'left'
      ctx.fillText(s.label, rsX, sy - 10)
      ctx.font = '800 32px Inter, system-ui, sans-serif'
      ctx.fillStyle = COLORS.noir
      ctx.fillText(s.value, rsX, sy + 24)
    })
  }
}

export default function ShareCard({ prenom, data, onClose }) {
  const canvasRef = useRef(null)
  const [format, setFormat] = useState('landscape')
  const [copied, setCopied] = useState(false)

  const redraw = useCallback((fmt) => {
    if (canvasRef.current) {
      drawCard(canvasRef.current, data, prenom, fmt)
    }
  }, [data, prenom])

  const handleFormatChange = (fmt) => {
    setFormat(fmt)
    setTimeout(() => redraw(fmt), 0)
  }

  const handleDownload = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `${prenom.toLowerCase()}-combien-il-reste.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  const handleCopy = async () => {
    if (!canvasRef.current) return
    try {
      const blob = await new Promise((res) => canvasRef.current.toBlob(res, 'image/png'))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      handleDownload()
    }
  }

  const handleShare = async () => {
    if (!canvasRef.current || !navigator.share) {
      handleDownload()
      return
    }
    try {
      const blob = await new Promise((res) => canvasRef.current.toBlob(res, 'image/png'))
      const file = new File([blob], `${prenom.toLowerCase()}.png`, { type: 'image/png' })
      await navigator.share({
        title: `${titleCase(prenom)} — Combien il en reste ?`,
        text: `Encore ${formatNumber(data.vivants)} ${titleCase(prenom)} en France !`,
        files: [file],
      })
    } catch {
      // User cancelled, ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-noir/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-noir">Partager</h3>
            <button onClick={onClose} className="text-gris hover:text-noir text-xl cursor-pointer">✕</button>
          </div>

          {/* Format toggle */}
          <div className="flex gap-2 mb-4">
            {[
              { key: 'landscape', label: 'Twitter / OG', ratio: '1200×630' },
              { key: 'square', label: 'Instagram', ratio: '1080×1080' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => handleFormatChange(f.key)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  format === f.key
                    ? 'bg-noir text-white'
                    : 'bg-gris-clair text-gris hover:text-noir'
                }`}
              >
                {f.label} <span className="opacity-60 text-xs">{f.ratio}</span>
              </button>
            ))}
          </div>

          {/* Canvas preview */}
          <div className="bg-gris-clair rounded-xl p-3 flex justify-center">
            <canvas
              ref={(el) => {
                canvasRef.current = el
                if (el) drawCard(el, data, prenom, format)
              }}
              className={`w-full rounded-lg shadow-md ${format === 'square' ? 'max-w-sm' : 'max-w-2xl'}`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 bg-gris-clair text-noir font-semibold rounded-xl hover:bg-noir hover:text-white transition-all cursor-pointer"
            >
              {copied ? 'Copié !' : 'Copier l\'image'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-3 bg-gris-clair text-noir font-semibold rounded-xl hover:bg-noir hover:text-white transition-all cursor-pointer"
            >
              Télécharger
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                onClick={handleShare}
                className="flex-1 py-3 bg-noir text-white font-semibold rounded-xl hover:bg-noir/90 transition-all cursor-pointer"
              >
                Partager
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
