import { memo } from 'react'
import { useMapStore } from '@/stores/mapStore'
import { adcodeOf, type ProvinceFeature } from '@/types/geo'

const STROKE_BASE = '#0b1f33'
const STROKE_ACTIVE = '#e2e8f0'

interface ProvinceLayerProps {
  features: ProvinceFeature[]
  /** adcode -> SVG path d 字符串（由父组件 memo 化）。 */
  pathDByAdcode: Record<string, string>
  /** 按省份编码返回分级设色填充。 */
  getFill: (adcode: string) => string
}

/**
 * 省份图层：按 getFill 分级设色填充，悬停高亮（发光滤镜）、点击选中。
 */
export const ProvinceLayer = memo(function ProvinceLayer({
  features,
  pathDByAdcode,
  getFill,
}: ProvinceLayerProps) {
  const hovered = useMapStore((s) => s.hovered)
  const selected = useMapStore((s) => s.selected)
  const setHovered = useMapStore((s) => s.setHovered)
  const setSelected = useMapStore((s) => s.setSelected)
  const toggleMulti = useMapStore((s) => s.toggleMulti)
  const clearMulti = useMapStore((s) => s.clearMulti)
  const setMousePos = useMapStore((s) => s.setMousePos)

  const hoveredCode = hovered ? adcodeOf(hovered) : ''
  const selectedCode = selected ? adcodeOf(selected) : ''

  return (
    <g>
      {features.map((f) => {
        const code = adcodeOf(f)
        const isHover = code === hoveredCode
        const isSelected = code === selectedCode
        const active = isHover || isSelected
        return (
          <path
            key={code}
            d={pathDByAdcode[code]}
            fill={getFill(code)}
            stroke={active ? STROKE_ACTIVE : STROKE_BASE}
            strokeWidth={active ? 1.4 : 0.5}
            filter={isHover ? 'url(#province-glow)' : undefined}
            style={{ cursor: 'pointer', transition: 'fill 500ms ease, stroke 150ms ease' }}
            onMouseEnter={() => setHovered(f)}
            onMouseLeave={() => setHovered(null)}
            onMouseMove={(e) => {
              const rect = (
                e.currentTarget.ownerSVGElement as SVGSVGElement
              ).getBoundingClientRect()
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
            }}
            onClick={(e) => {
              // Ctrl/Cmd+点击进入多选对比；普通点击单选并退出对比
              if (e.ctrlKey || e.metaKey) toggleMulti(f)
              else {
                setSelected(f)
                clearMulti()
              }
            }}
          />
        )
      })}
    </g>
  )
})
