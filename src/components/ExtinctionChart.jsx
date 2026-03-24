import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, ComposedChart, Legend,
} from 'recharts'
import { formatNumber } from '../utils/prenomUtils'

const LABEL_MAP = {
  naissances: 'Naissances',
  naissances_h: 'Naissances (H)',
  naissances_f: 'Naissances (F)',
  vivants: 'Population vivante',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gris-clair rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-noir">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {LABEL_MAP[entry.dataKey] || entry.dataKey} : {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  )
}

export default function ExtinctionChart({ courbe, picAnnee, anneeExtinction, mixte }) {
  if (!courbe || courbe.length === 0) return null

  const hasGenderData = mixte && courbe.some(d => d.naissances_h > 0 && d.naissances_f > 0)

  return (
    <div className="mt-3">
      <h3 className="text-sm font-semibold text-gris uppercase tracking-wide mb-3">
        Naissances par décennie vs population vivante
      </h3>
      <div className="h-[220px] lg:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={courbe} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="decade"
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : v}
            />
            <Tooltip content={<CustomTooltip />} />
            {hasGenderData ? (
              <>
                <Bar
                  dataKey="naissances_h"
                  stackId="naissances"
                  fill="#93c5fd"
                  name="Naissances (H)"
                />
                <Bar
                  dataKey="naissances_f"
                  stackId="naissances"
                  fill="#f9a8d4"
                  radius={[4, 4, 0, 0]}
                  name="Naissances (F)"
                />
              </>
            ) : (
              <Bar
                dataKey="naissances"
                fill="#93c5fd"
                radius={[4, 4, 0, 0]}
                name="Naissances"
              />
            )}
            <Area
              type="monotone"
              dataKey="vivants"
              fill="#bbf7d0"
              stroke="#16a34a"
              strokeWidth={2}
              fillOpacity={0.5}
              name="Population vivante"
            />
            {hasGenderData && (
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                iconType="square"
                formatter={(value) => LABEL_MAP[value] || value}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gris text-center mt-2">
        Pic : {picAnnee}
        {anneeExtinction && anneeExtinction <= 2226 && ` · Extinction estimée : ~${anneeExtinction}`}
        {anneeExtinction && anneeExtinction > 2226 && ' · Extinction lointaine'}
      </p>
    </div>
  )
}
