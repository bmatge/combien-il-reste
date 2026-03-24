import { Link, useLocation } from 'react-router-dom'
import { IconSearch, IconTarget } from './Icons'

const tabs = [
  { to: '/', label: 'Consulter', Icon: IconSearch },
  { to: '/quiz', label: 'Quiz', Icon: IconTarget },
]

export default function NavTabs() {
  const { pathname } = useLocation()

  const isActive = (to) =>
    to === '/' ? pathname === '/' || pathname.startsWith('/prenom') : pathname.startsWith(to)

  return (
    <nav className="flex justify-center gap-1 bg-white/80 backdrop-blur-sm rounded-full p-1 border border-gris-clair shadow-sm w-fit mx-auto">
      {tabs.map((tab) => {
        const active = isActive(tab.to)
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              active
                ? 'bg-noir text-white shadow-md'
                : 'text-gris hover:text-noir'
            }`}
          >
            <tab.Icon className="w-4 h-4" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
