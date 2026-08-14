import { useMapStore } from '@/stores/mapStore'

/**
 * 悬停提示框：跟随鼠标，展示省份名称与占位指标（真实数据 Phase 2-3 接入）。
 */
export function Tooltip() {
  const hovered = useMapStore((s) => s.hovered)
  const mousePos = useMapStore((s) => s.mousePos)

  if (!hovered) return null

  const name = hovered.properties?.name ?? '未知'
  const adcode = String(hovered.properties?.adcode ?? '')

  return (
    <div
      className="pointer-events-none absolute z-20 w-44 rounded-md border border-map-border bg-map-panel/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
      style={{
        left: mousePos.x,
        top: mousePos.y,
        transform: 'translate(-50%, calc(-100% - 14px))',
      }}
    >
      <div className="text-sm font-semibold text-white">{name}</div>
      <div className="mt-0.5 text-[10px] text-slate-500">编码 {adcode}</div>
      <div className="mt-2 space-y-1 text-slate-300">
        <div className="flex justify-between">
          <span>总装机</span>
          <span className="text-slate-500">— MW</span>
        </div>
        <div className="flex justify-between">
          <span>电价</span>
          <span className="text-slate-500">— 元/MWh</span>
        </div>
      </div>
      <div className="mt-1 text-[9px] text-slate-600">数据将在 Phase 2-3 接入</div>
    </div>
  )
}
