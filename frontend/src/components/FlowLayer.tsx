import { useMemo, type MouseEvent as ReactMouseEvent } from 'react'
import type { ProvinceFlow } from '@/types/data'
import { useMapStore } from '@/stores/mapStore'

interface FlowLayerProps {
  flows: ProvinceFlow[]
  centroidByAdcode: Record<string, [number, number]>
  highlighted?: boolean
}

/**
 * 跨区域受送电年度连线：送端→受端省质心的**下偏弧线**（绿色系），
 * 与输电通道（上偏弧、橙/蓝）视觉区分；线宽映射年度电量。
 */
export function FlowLayer({ flows, centroidByAdcode }: FlowLayerProps) {
  const setHoveredFlow = useMapStore((s) => s.setHoveredFlow)
  const setMousePos = useMapStore((s) => s.setMousePos)

  const items = useMemo(() => {
    if (!flows.length) return []
    const maxV = Math.max(...flows.map((f) => f.volume_gwh))
    return flows
      .map((f, idx): (ProvinceFlow & { d: string; width: number }) | null => {
        const a = centroidByAdcode[f.from_code]
        const b = centroidByAdcode[f.to_code]
        if (!a || !b) return null
        // 下偏弧（与通道上偏弧相反），弧度按序微调避免多条重叠
        const bow = 0.18 + (idx % 3) * 0.05
        const cx = (a[0] + b[0]) / 2
        const cy = (a[1] + b[1]) / 2 + Math.abs(b[0] - a[0]) * bow
        return {
          ...f,
          d: `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`,
          width: 1.5 + 3 * (f.volume_gwh / maxV),
        }
      })
      .filter((x): x is ProvinceFlow & { d: string; width: number } => !!x)
  }, [flows, centroidByAdcode])

  const updateMouse = (e: ReactMouseEvent<SVGPathElement>) => {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <g>
      {items.map((f) => (
        <g key={`${f.from_code}-${f.to_code}`}>
          {/* 透明加宽命中区 */}
          <path
            d={f.d}
            fill="none"
            stroke="transparent"
            strokeWidth={10}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredFlow(f)}
            onMouseMove={updateMouse}
            onMouseLeave={() => setHoveredFlow(null)}
          />
          <path
            d={f.d}
            fill="none"
            stroke="#34d399"
            strokeWidth={f.width}
            strokeLinecap="round"
            opacity={0.9}
            pointerEvents="none"
          >
            <title>{`${f.from_province} → ${f.to_province}：${f.volume_gwh.toLocaleString()} GWh（${f.label}）`}</title>
          </path>
          {/* 受端端点标记 */}
          <circle
            cx={centroidByAdcode[f.to_code]?.[0]}
            cy={centroidByAdcode[f.to_code]?.[1]}
            r={2.2}
            fill="#34d399"
            stroke="#0a1628"
            strokeWidth={0.6}
            pointerEvents="none"
          />
        </g>
      ))}
    </g>
  )
}
