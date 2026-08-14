import { useMemo } from 'react'
import { geoAlbers, geoPath } from 'd3-geo'
import type { ProvinceFeature } from '@/types/geo'

interface SouthChinaSeaInsetProps {
  feature: ProvinceFeature
  /** 主视口宽度（viewBox），用于定位插图框。 */
  width: number
  height: number
}

/**
 * 南海诸岛插图：在主地图右下角以独立小框展示九段线 / 南海诸岛要素，
 * 不受主图缩放平移影响，确保领土要素完整呈现（PRD §3.1.1）。
 */
export function SouthChinaSeaInset({ feature, width, height }: SouthChinaSeaInsetProps) {
  const boxW = 168
  const boxH = 208
  const pad = 8
  const labelH = 18
  const x = width - boxW - 24
  const y = height - boxH - 24

  const d = useMemo(() => {
    const projection = geoAlbers()
      .rotate([-105, 0])
      .parallels([25, 47])
      .fitExtent(
        [
          [x + pad, y + pad],
          [x + boxW - pad, y + boxH - pad - labelH],
        ],
        feature,
      )
    return geoPath(projection)(feature) ?? ''
  }, [feature, x, y])

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={boxW}
        height={boxH}
        rx={4}
        fill="#0a1628"
        stroke="#2a4a6b"
        strokeWidth={1}
      />
      <path d={d} fill="#16324f" stroke="#3b6e9e" strokeWidth={0.6} />
      <text
        x={x + boxW / 2}
        y={y + boxH - 5}
        textAnchor="middle"
        style={{ fontSize: 11 }}
        className="fill-slate-400"
      >
        南海诸岛
      </text>
    </g>
  )
}
