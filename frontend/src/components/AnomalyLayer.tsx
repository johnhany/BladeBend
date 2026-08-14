export interface AnomalyMark {
  code: string
  cx: number
  cy: number
  reason: string
}

/**
 * 异常标注层：在出现负电价/触及限价的省份质心处绘制 ⚠（PRD §3.2.2）。
 * 需置于缩放 <g> 内，随地图平移缩放。
 */
export function AnomalyLayer({ marks }: { marks: AnomalyMark[] }) {
  if (!marks.length) return null
  return (
    <g>
      {marks.map((m) => (
        <text
          key={m.code}
          x={m.cx}
          y={m.cy}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: 14, paintOrder: 'stroke', pointerEvents: 'none' }}
          stroke="#0a1628"
          strokeWidth={2.5}
          fill="#f59e0b"
        >
          ⚠<title>{`异常：${m.reason}`}</title>
        </text>
      ))}
    </g>
  )
}
