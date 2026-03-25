import { useState, useEffect, useCallback } from 'react'
import NavTabs from './NavTabs'
import { IconSkull } from './Icons'
import { titleCase } from '../utils/prenomUtils'

const SAMPLE_PRENOMS = [
  'JEAN', 'MARIE', 'KEVIN', 'GERARD', 'JADE', 'MARCEL',
  'NATHALIE', 'PHILIPPE', 'MONIQUE', 'LUCAS', 'YVETTE',
  'NICOLAS', 'SYLVIE', 'PATRICK', 'BERNARD', 'EMMA',
  'CHRISTOPHE', 'SIMONE', 'THIERRY', 'SANDRINE', 'RENE',
  'ELODIE', 'PIERRE', 'FRANCOISE', 'ALBERT', 'VIRGINIE',
]

function RotatingPrenom() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * SAMPLE_PRENOMS.length))
  const [visible, setVisible] = useState(true)

  const cycle = useCallback(() => {
    setVisible(false)
    setTimeout(() => {
      setIndex((i) => (i + 1) % SAMPLE_PRENOMS.length)
      setVisible(true)
    }, 300)
  }, [])

  useEffect(() => {
    const id = setInterval(cycle, 2500)
    return () => clearInterval(id)
  }, [cycle])

  return (
    <span
      className={`inline-block font-semibold text-noir transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
      }`}
    >
      {titleCase(SAMPLE_PRENOMS[index])}
    </span>
  )
}

export default function Header() {
  return (
    <header className="pt-5 pb-4 px-4 flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 flex-wrap justify-center">
        <h1 className="text-3xl md:text-4xl font-black text-noir tracking-tight flex items-center gap-2">
          <IconSkull className="w-7 h-7 md:w-8 md:h-8" />
          Combien il en reste ?
        </h1>
        <NavTabs />
      </div>
      <p className="text-gris text-sm italic">
        Combien de <RotatingPrenom /> reste-t-il en France ?
      </p>
    </header>
  )
}
