import { useMapStore } from '@/stores/mapStore'
import { formatPower, formatPrice } from '@/utils/colorScales'
import type { CapacityItem, PriceItem } from '@/types/data'

interface TooltipProps {
  capacityByAdcode?: Map<string, CapacityItem>
  priceByAdcode?: Map<string, PriceItem>
}

/** 悬停提示框：省份名称 + 当前指标摘要。 */
export function Tooltip({ capacityByAdcode, priceByAdcode }: TooltipProps) {
  const hovered = useMapStore((s) => s.hovered)
  const mousePos = useMapStore((s) => s.mousePos)

  if (!hovered) return null

  const code = String(hovered.properties?.adcode ?? '')
  const name = hovered.properties?.name ?? '未知'
  const cap = capacityByAdcode?.get(code)
  const pr = priceByAdcode?.get(code)

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
              <span>风+光</span>
              <span>{formatPower(cap.wind_mw + cap.pv_mw)}</span>
            </div>
          </>
        ) : null}
        {pr ? (
          <>
            <div className="flex justify-between gap-3 text-slate-400">
              <span>现货均价</span>
              <span>{formatPrice(pr.spot_avg_yuan_mwh)}</span>
            </div>
            <div className="flex justify-between gap-3 text-slate-400">
              <span>中长期</span>
              <span>{formatPrice(pr.medium_long_avg_yuan_mwh)}</span>
            </div>
            {pr.is_anomaly && <div className="pt-0.5 text-amber-500">⚠ {pr.anomaly_reason}</div>}
          </>
        ) : null}
        {!cap && !pr && <div className="text-slate-500">暂无数据</div>}
      </div>
    </div>
  )
}
