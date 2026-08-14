import { memo } from 'react'
import { useMapStore } from '@/stores/mapStore'
import { adcodeOf, type ProvinceFeature } from '@/types/geo'

// 省份填充色（Phase 1 无业务数据，使用统一底色 + 高亮态）。
const FILL_BASE = '#16324f'
const FILL_HOVER = '#2a6aa8'
const FILL_SELECTED = '#3b82f6'
const STROKE_BASE = '#0b1f33'
const STROKE_ACTIVE = '#9ec6ff'

interface ProvinceLayerProps {
  features: ProvinceFeature[]
  /** adcode -> SVG path d 字符串（由父组件 memo 化，避免悬停时重算投影）。 */
  pathDByAdcode: Record<string, string>
}

/**
 * 省份图层：渲染各省 <path>，处理悬停高亮（发光滤镜）与点击选中。
 * 路径字符串由父组件预算并传入；本组件仅随 hovered/selected 变化更新填充与描边。
 */
export const ProvinceLayer = memo(function ProvinceLayer({
  features,
  pathDByAdcode,
}: ProvinceLayerProps) {
  const hovered = useMapStore((s) => s.hovered)
  const selected = useMapStore((s) => s.selected)
  const setHovered = useMapStore((s) => s.setHovered)
  const setSelected = useMapStore((s) => s.setSelected)
  const setMousePos = useMapStore((s) => s.setMousePos)

  const hoveredCode = hovered ? adcodeOf(hovered) : ''
  const selectedCode = selected ? adcodeOf(selected) : ''

  return (
    <g>
      {features.map((f) => {
        const code = adcodeOf(f)
        const isHover = code === hoveredCode
        const isSelected = code === selectedCode
        const fill = isSelected ? FILL_SELECTED : isHover ? FILL_HOVER : FILL_BASE
        const active = isHover || isSelected
        return (
          <path
            key={code}
            d={pathDByAdcode[code]}
            fill={fill}
            stroke={active ? STROKE_ACTIVE : STROKE_BASE}
            strokeWidth={active ? 1.4 : 0.5}
            filter={isHover ? 'url(#province-glow)' : undefined}
            style={{ cursor: 'pointer', transition: 'fill 150ms ease' }}
            onMouseEnter={() => setHovered(f)}
            onMouseLeave={() => setHovered(null)}
            onMouseMove={(e) => {
              // 跟随省份悬停更新鼠标位置（Tooltip 定位）
              const rect = (
                e.currentTarget.ownerSVGElement as SVGSVGElement
              ).getBoundingClientRect()
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
            }}
            onClick={() => setSelected(f)}
          />
        )
      })}
    </g>
  )
})
