import { useMemo } from 'react'
import type { GeoProjection } from 'd3-geo'
import type { City } from '@/types/data'
import CITIES from '@/assets/geo/china-cities.json'
import { useUIStore } from '@/stores/uiStore'
import { useMapStore } from '@/stores/mapStore'

export { CITIES }

/** 城市点位层：省会 + 主要负荷中心，点径映射用电负荷（PRD §3.1.3）；
 * 点径随缩放次线性增大（屏幕视觉尺寸 ∝ k^0.45），避免放大后过大。 */
export function CityLayer({ projection }: { projection: GeoProjection }) {
  const highlightCity = useUIStore((s) => s.highlightCity)
  const zoomScale = useMapStore((s) => s.zoomScale)

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

  // 缩放补偿：元素已在缩放 <g> 内被放大 k 倍，需除以 k^0.55 抵消，
  // 最终屏幕上的视觉尺寸 = k × k^-0.55 = k^0.45（次线性增大，k=8 时约 2.55 倍而非 8 倍）
  const s = Math.pow(zoomScale, -0.55)

  return (
    <g>
      {items.map((c) => {
        const active = c.name === highlightCity
        const r = (active ? c.r + 1.6 : c.r) * s
        return (
          <g key={c.name}>
            <circle
              cx={c.x}
              cy={c.y}
              r={r}
              fill={active ? '#ffffff' : '#cbd5e1'}
              stroke="#0a1628"
              strokeWidth={0.6 * s}
              style={{ cursor: 'pointer' }}
            >
              <title>{`${c.name} · 最大负荷约 ${c.load} 万kW`}</title>
            </circle>
            {active && (
              <text
                x={c.x}
                y={c.y - r - 4 * s}
                textAnchor="middle"
                style={{ fontSize: 10 * s, paintOrder: 'stroke' }}
                stroke="#0a1628"
                strokeWidth={2.5 * s}
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
