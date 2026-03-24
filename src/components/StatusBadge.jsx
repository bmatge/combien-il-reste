const statusConfig = {
  "En voie d'extinction": { bg: 'bg-rouge-clair', text: 'text-rouge', dot: 'bg-rouge' },
  "Menacé": { bg: 'bg-orange-clair', text: 'text-orange', dot: 'bg-orange' },
  "Rare": { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
  "Commun": { bg: 'bg-vert-clair', text: 'text-vert', dot: 'bg-vert' },
}

export default function StatusBadge({ statut, blink }) {
  // Remove emoji prefix from statut
  const label = statut.replace(/^[^\w\s]*\s*/, '').replace(/^(🔴|🟠|🟡|🟢)\s*/, '')
  const config = statusConfig[label] || statusConfig["Commun"]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${config.dot} ${blink ? 'animate-pulse' : ''}`}
      />
      {label}
    </span>
  )
}
