import { useMapStore } from '@/stores/mapStore'
import { formatPower } from '@/utils/colorScales'
import type { CapacityItem } from '@/types/data'

interface TooltipProps {
  capacityByAdcode?: Map<string, CapacityItem>
}

/** 悬停提示框：省份名称 + 该省装机摘要（真实数据）。 */
export function Tooltip({ capacityByAdcode }: TooltipProps) {
  const hovered = useMapStore((s) => s.hovered)
  const mousePos = useMapStore((s) => s.mousePos)

  if (!hovered) return null

  const code = String(hovered.properties?.adcode ?? '')
  const name = hovered.properties?.name ?? '未知'
  const cap = capacityByAdcode?.get(code)

  return (
    <div
      className="pointer-events-none absolute z-20 w-48 rounded-md border border-map-border bg-map-panel/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
      style={{
        left: mousePos.x,
        top: mousePos.y,
        transform: 'translate(-50%, calc(-100% - 14px))',
      }}
    >
      <div className="text-sm font-semibold text-white">{name}</div>
      <div className="mt-1.5 space-y-0.5 text-[11px]">
        {cap ? (
          <>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">总装机</span>
              <span className="font-medium text-white">{formatPower(cap.total_mw)}</span>
            </div>
            <div className="flex justify-between gap-3 text-slate-400">
              <span>火电</span>
              <span>{formatPower(cap.thermal_mw)}</span>
            </div>
            <div className="flex justify-between gap-3 text-slate-400">
              <span>风+光</span>
              <span>{formatPower(cap.wind_mw + cap.pv_mw)}</span>
            </div>
            <div className="flex justify-between gap-3 text-slate-400">
              <span>水电</span>
              <span>{formatPower(cap.hydro_mw)}</span>
            </div>
          </>
        ) : (
          <div className="text-slate-500">暂无装机数据</div>
        )}
      </div>
    </div>
  )
}
