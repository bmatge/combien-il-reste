import { formatNumber } from '../utils/prenomUtils'
import { IconLandmark } from './Icons'

function getQPConfig(qp) {
  if (qp === null || qp === undefined)
    return { color: 'bg-gris-clair', label: "La démocratie vous boude.", width: 0 }
  if (qp > 3)
    return { color: 'bg-rouge', label: "Ce prénom gouverne la France.", width: Math.min(qp / 5, 1) }
  if (qp > 1.5)
    return { color: 'bg-orange', label: "Bien installé au pouvoir.", width: qp / 5 }
  if (qp > 0.5)
    return { color: 'bg-bleu', label: "Fait de la figuration.", width: qp / 5 }
  return { color: 'bg-gris', label: "Pas encore l'oreille de la République.", width: Math.max(qp / 5, 0.04) }
}

export default function PouvoirMeter({ qp, nbElus }) {
  const config = getQPConfig(qp)

  return (
    <div>
      <h3 className="text-sm font-semibold text-gris uppercase tracking-wide mb-0.5 flex items-center gap-2">
        <IconLandmark className="w-4 h-4" />
        Quotient de Pouvoir
      </h3>
      <p className="text-xs text-gris mb-2.5 leading-snug">
        Ratio entre la part d'élus portant ce prénom et sa part dans la population.
        1x = représentation parfaite.
      </p>

      <p className="text-noir font-medium italic text-sm mb-2">
        "{config.label}"
      </p>

      {qp != null && (
        <>
          <div className="w-full bg-gris-clair rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${config.color} rounded-full transition-all duration-700`}
              style={{ width: `${config.width * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gris">
            <span>0x</span>
            <span className="font-bold text-noir">{qp}x</span>
            <span>5x</span>
          </div>
        </>
      )}

      <p className="text-xs text-gris mt-1.5">
        {formatNumber(nbElus)} élu{nbElus > 1 ? 's' : ''} recensé{nbElus > 1 ? 's' : ''}
      </p>
    </div>
  )
}
