import { useMemo } from 'react'
import type { GeoProjection } from 'd3-geo'

/** 简化主要河流折线（经纬度，近似走向）。 */
const RIVERS: { name: string; points: [number, number][] }[] = [
  {
    name: '长江',
    points: [
      [90.6, 33.4],
      [96.0, 31.5],
      [99.0, 28.5],
      [102.0, 27.0],
      [104.6, 28.7],
      [106.5, 29.6],
      [108.5, 30.5],
      [111.3, 30.7],
      [112.5, 30.4],
      [114.3, 30.6],
      [115.9, 29.9],
      [117.4, 30.9],
      [118.8, 32.0],
      [120.6, 31.9],
      [121.9, 31.5],
    ],
  },
  {
    name: '黄河',
    points: [
      [96.4, 35.0],
      [100.0, 34.5],
      [102.5, 35.5],
      [103.8, 36.1],
      [106.3, 38.5],
      [109.0, 40.6],
      [111.2, 40.3],
      [110.5, 37.5],
      [110.3, 34.6],
      [111.2, 34.8],
      [113.6, 34.8],
      [115.5, 35.9],
      [117.0, 36.7],
      [119.0, 37.8],
    ],
  },
  {
    name: '珠江',
    points: [
      [104.4, 23.4],
      [106.5, 23.8],
      [108.5, 23.6],
      [110.2, 23.5],
      [112.5, 23.1],
      [113.5, 23.1],
    ],
  },
]

/** 自然地理要素层：主要河流以细线低调呈现（PRD §3.1.5）。 */
export function TerrainLayer({ projection }: { projection: GeoProjection }) {
  const paths = useMemo(
    () =>
      RIVERS.map((r) => {
        const pts = r.points
          .map((pt) => projection(pt))
          .filter(
            (p): p is [number, number] => !!p && Number.isFinite(p[0]) && Number.isFinite(p[1]),
          )
        return {
          name: r.name,
          d:
            pts.length >= 2
              ? `M${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}`
              : '',
          labelAt: pts.length ? pts[pts.length - 1] : null,
        }
      }),
    [projection],
  )

  return (
    <g>
      {paths.map((r) =>
        r.d ? (
          <g key={r.name}>
            <path
              d={r.d}
              fill="none"
              stroke="#3b5f82"
              strokeWidth={1}
              strokeLinecap="round"
              opacity={0.55}
              pointerEvents="none"
            >
              <title>{r.name}</title>
            </path>
            {r.labelAt && (
              <text
                x={r.labelAt[0]}
                y={r.labelAt[1] - 3}
                textAnchor="middle"
                style={{ fontSize: 8 }}
                fill="#51708f"
                pointerEvents="none"
              >
                {r.name}
              </text>
            )}
          </g>
        ) : null,
      )}
    </g>
  )
}
