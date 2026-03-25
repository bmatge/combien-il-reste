import { useState } from 'react'
import { titleCase, formatNumber } from '../utils/prenomUtils'
import { getEasterEgg } from '../utils/easterEggs'
import StatusBadge from './StatusBadge'
import ExtinctionChart from './ExtinctionChart'
import PouvoirMeter from './PouvoirMeter'
import PouvoirBreakdown from './PouvoirBreakdown'
import EasterEgg from './EasterEgg'
import Celebrites from './Celebrites'
import ShareCard from './ShareCard'
import {
  IconUsers, IconTrendDown, IconClock, IconBaby,
  IconCalendar, IconPercent, IconTrendUp, IconMale, IconFemale,
  IconShare,
} from './Icons'

const EXTINCTION_UNRELIABLE_AFTER = 2226

function KpiCard({ icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3">
      <div className="mt-0.5 text-gris shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gris leading-tight">{label}</p>
        <p className="text-sm font-bold text-noir leading-snug">{value}</p>
        {sub && <p className="text-xs text-gris mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function buildKpis(data, extinctionLointaine, survivalRate, yearsLeft) {
  const kpis = []

  if (data.age_median != null) {
    kpis.push({
      icon: <IconCalendar className="w-4 h-4" />,
      label: 'Âge médian',
      value: `${data.age_median} ans`,
      sub: data.age_median < 25 ? 'Prénom jeune' : data.age_median > 60 ? 'Prénom vieillissant' : null,
    })
  }

  if (data.pic_annee) {
    kpis.push({
      icon: <IconTrendUp className="w-4 h-4" />,
      label: 'Pic de naissances',
      value: `${data.pic_annee}`,
      sub: `${formatNumber(data.pic_naissances)}/an`,
    })
  }

  if (data.total_naissances > 0) {
    kpis.push({
      icon: <IconBaby className="w-4 h-4" />,
      label: 'Naissances depuis 1900',
      value: formatNumber(data.total_naissances),
    })
  }

  if (survivalRate != null) {
    kpis.push({
      icon: <IconPercent className="w-4 h-4" />,
      label: 'Taux de survie',
      value: `${survivalRate} %`,
      sub: survivalRate > 90 ? 'Quasi tous en vie' : survivalRate < 30 ? 'Génération en déclin' : null,
    })
  }

  if (data.deces_par_an > 0) {
    kpis.push({
      icon: <IconTrendDown className="w-4 h-4" />,
      label: 'Rythme de décès',
      value: `~${formatNumber(data.deces_par_an)}/an`,
    })
  }

  if (data.annee_extinction && !extinctionLointaine) {
    kpis.push({
      icon: <IconClock className="w-4 h-4" />,
      label: 'Extinction estimée',
      value: `~${data.annee_extinction}`,
      sub: yearsLeft > 0 ? `dans ~${yearsLeft} ans` : null,
    })
  }

  if (extinctionLointaine) {
    kpis.push({
      icon: <IconClock className="w-4 h-4" />,
      label: 'Extinction',
      value: 'Lointaine',
      sub: 'Prénom encore jeune',
    })
  }

  if (data.mixte && data.vivants_h > 0 && data.vivants_f > 0) {
    kpis.push({
      icon: <IconUsers className="w-4 h-4" />,
      label: 'Répartition H/F',
      value: `${formatNumber(data.vivants_h)} / ${formatNumber(data.vivants_f)}`,
      sub: (
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-0.5"><IconMale className="w-3 h-3" /> H</span>
          <span className="inline-flex items-center gap-0.5"><IconFemale className="w-3 h-3" /> F</span>
        </span>
      ),
    })
  }

  return kpis
}

export default function ResultCard({ prenom, data }) {
  const [showShare, setShowShare] = useState(false)
  const egg = getEasterEgg(prenom, data)
  const extinctionLointaine = data.annee_extinction && data.annee_extinction > EXTINCTION_UNRELIABLE_AFTER
  const survivalRate = data.total_naissances > 0
    ? Math.round((data.vivants / data.total_naissances) * 100)
    : null
  const currentYear = new Date().getFullYear()
  const yearsLeft = data.annee_extinction ? data.annee_extinction - currentYear : null
  const kpis = buildKpis(data, extinctionLointaine, survivalRate, yearsLeft)
  const hasPouvoir = data.quotient_pouvoir != null || data.nb_elus_total > 0
  const hasCelebs = data.celebrites?.length > 0

  return (
    <div className="mt-6 space-y-px">
      {/* Header card */}
      <div className="bg-white rounded-t-3xl shadow-lg border border-gris-clair px-8 md:px-12 py-6 text-center relative">
        <button
          onClick={() => setShowShare(true)}
          className="absolute top-4 right-4 p-2 rounded-full text-gris hover:text-noir hover:bg-gris-clair transition-all cursor-pointer"
          title="Partager"
        >
          <IconShare className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center gap-3">
          <h2 className="text-4xl md:text-5xl font-black text-noir tracking-tight">
            {titleCase(prenom)}
          </h2>
          <StatusBadge statut={data.statut} blink={egg?.blink} />
        </div>
        <p className="mt-2 text-lg text-gris">
          Encore <span className="text-2xl md:text-3xl font-black text-noir tabular-nums">{formatNumber(data.vivants)}</span> en France
        </p>
      </div>

      {/* Data card */}
      <div className="bg-white rounded-b-3xl shadow-lg border border-t-0 border-gris-clair overflow-hidden">

      {/* Two-column layout on desktop */}
      <div className="lg:flex">
        {/* LEFT column: KPIs + Chart */}
        <div className="lg:flex-1 min-w-0">
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi, i) => (
              <div
                key={i}
                className="border-b border-r border-gris-clair/40 lg:[&:nth-child(3n)]:border-r-0 [&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r"
              >
                <KpiCard {...kpi} />
              </div>
            ))}
          </div>

          {/* Easter egg */}
          {egg && (
            <div className="px-5 pt-3">
              <EasterEgg egg={egg} />
            </div>
          )}

          {extinctionLointaine && (
            <p className="mx-5 mt-3 text-xs text-gris italic">
              * Projection basée sur le rythme actuel de décès ({formatNumber(data.deces_par_an)}/an).
              Ce prénom est encore jeune — le vrai pic de mortalité est à venir.
            </p>
          )}

          {/* Chart */}
          <div className="px-5 pb-5 pt-2">
            <ExtinctionChart
              courbe={data.courbe}
              picAnnee={data.pic_annee}
              anneeExtinction={data.annee_extinction}
              mixte={data.mixte}
            />
          </div>
        </div>

        {/* RIGHT column: Pouvoir + Célébrités */}
        {(hasPouvoir || hasCelebs) && (
          <div className="lg:w-80 xl:w-96 2xl:w-[28rem] border-t lg:border-t-0 lg:border-l border-gris-clair/60 flex flex-col shrink-0">
            {hasPouvoir && (
              <div className="px-5 py-5 border-b border-gris-clair/60">
                <PouvoirMeter
                  qp={data.quotient_pouvoir}
                  nbElus={data.nb_elus_total}
                />
                <PouvoirBreakdown qpParNiveau={data.qp_par_niveau} />
              </div>
            )}

            {hasCelebs && (
              <div className="flex-1">
                <Celebrites celebrites={data.celebrites} ageMedian={data.age_median} />
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {showShare && (
        <ShareCard prenom={prenom} data={data} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}
