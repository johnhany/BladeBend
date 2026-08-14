import { useMemo } from 'react'
import type { GeoProjection } from 'd3-geo'
import type { City } from '@/types/data'
import CITIES from '@/assets/geo/china-cities.json'
import { useUIStore } from '@/stores/uiStore'

export { CITIES }

/** 城市点位层：省会 + 主要负荷中心，点径映射用电负荷（PRD §3.1.3）。 */
export function CityLayer({ projection }: { projection: GeoProjection }) {
  const highlightCity = useUIStore((s) => s.highlightCity)

  const items = useMemo(
    () =>
      (CITIES as City[])
        .map((c) => {
          const p = projection([c.lng, c.lat])
          if (!p || !Number.isFinite(p[0])) return null
          const r = 1.4 + 2.2 * Math.sqrt(c.load / 3400)
          return { ...c, x: p[0], y: p[1], r }
        })
        .filter((c): c is City & { x: number; y: number; r: number } => !!c),
    [projection],
  )

  return (
    <g>
      {items.map((c) => {
        const active = c.name === highlightCity
        return (
          <g key={c.name}>
            <circle
              cx={c.x}
              cy={c.y}
              r={active ? c.r + 1.6 : c.r}
              fill={active ? '#ffffff' : '#cbd5e1'}
              stroke="#0a1628"
              strokeWidth={0.6}
              style={{ cursor: 'pointer', transition: 'r 150ms ease, fill 150ms ease' }}
            >
              <title>{`${c.name} · 最大负荷约 ${c.load} 万kW`}</title>
            </circle>
            {active && (
              <text
                x={c.x}
                y={c.y - c.r - 4}
                textAnchor="middle"
                style={{ fontSize: 10, paintOrder: 'stroke' }}
                stroke="#0a1628"
                strokeWidth={2.5}
                fill="#ffffff"
                pointerEvents="none"
              >
                {c.name}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
