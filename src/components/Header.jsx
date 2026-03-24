import NavTabs from './NavTabs'
import { IconSkull } from './Icons'

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
        L'INSEE sait combien il en reste.
      </p>
    </header>
  )
}
