const niveauLabels = {
  municipal: 'Maires & conseillers',
  intercommunal: 'Intercommunal',
  departemental: 'Départemental',
  regional: 'Régional',
  national: 'Députés & sénateurs',
  europeen: 'Parlement européen',
}

function getBarColor(qp) {
  if (qp > 3) return 'bg-rouge'
  if (qp > 1.5) return 'bg-orange'
  if (qp > 0.5) return 'bg-bleu'
  return 'bg-gris'
}

export default function PouvoirBreakdown({ qpParNiveau }) {
  if (!qpParNiveau) return null

  const entries = Object.entries(qpParNiveau)
    .filter(([, qp]) => qp > 0)
    .sort((a, b) => b[1] - a[1])

  if (entries.length === 0) return null

  const maxQP = Math.max(...entries.map(([, v]) => v), 5)

  return (
    <div>
      <div className="space-y-2">
        {entries.map(([niveau, qp]) => (
          <div key={niveau} className="flex items-center gap-3 text-sm">
            <span className="w-40 text-right text-gris truncate">
              {niveauLabels[niveau] || niveau}
            </span>
            <div className="flex-1 bg-gris-clair rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getBarColor(qp)} rounded-full transition-all duration-500`}
                style={{ width: `${(qp / maxQP) * 100}%` }}
              />
            </div>
            <span className="w-14 text-right font-mono text-noir font-medium">
              {qp}x
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
