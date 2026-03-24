export default function Methode({ onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl lg:max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 lg:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-noir">Méthode de calcul</h2>
          <button
            onClick={onClose}
            className="text-gris hover:text-noir text-2xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <div className="text-sm text-gris space-y-4 leading-relaxed">
          <div>
            <h3 className="font-semibold text-noir mb-1">Survie estimée</h3>
            <p>
              Croisement du fichier des prénoms (INSEE, naissances 1900–2024) et des
              estimations de population officielle INSEE 2026 par cohorte de naissance
              et sexe. Ce calcul intègre le solde migratoire estimé par l'INSEE.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-noir mb-1">Vitesse d'extinction</h3>
            <p>
              Calculée à partir du fichier des personnes décédées (INSEE, décès
              2020–2025), moyennée sur 5 ans.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-noir mb-1">Quotient de Pouvoir</h3>
            <p>
              Rapport entre la part d'un prénom parmi les ~500 000 élus du Répertoire
              National des Élus (Ministère de l'Intérieur, 12/2025) et sa part dans la
              population française estimée. Un QP de 2 signifie que ce prénom est deux
              fois plus représenté parmi les élus que dans la population.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-noir mb-1">Biais connus</h3>
            <ul className="list-disc ml-4 space-y-1">
              <li>Prénoms rares regroupés par l'INSEE (&lt; 20 occurrences/an)</li>
              <li>Exhaustivité partielle de l'état civil avant 1946</li>
              <li>Décès à l'étranger partiellement couverts</li>
            </ul>
          </div>

          <div className="border-t border-gris-clair pt-4">
            <p className="font-semibold text-noir">
              Ce n'est pas un recensement.
            </p>
            <p>
              C'est une estimation fun à partir de données officielles libres.
              Licences : Licence Ouverte v2.0 (Etalab) pour toutes les sources.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
