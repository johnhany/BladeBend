import { useMapStore } from '@/stores/mapStore'
import { formatEnergy, formatPower, formatPrice } from '@/utils/colorScales'
import type { CapacityItem, PriceItem, TradeItem } from '@/types/data'

interface TooltipProps {
  capacityByAdcode?: Map<string, CapacityItem>
  priceByAdcode?: Map<string, PriceItem>
  /** channel_id -> 当月交易（通道悬停卡片用）。 */
  channelTrade?: Map<string, TradeItem>
}

/** 悬停提示框：优先显示通道卡片（悬停通道时），否则显示省份摘要。 */
export function Tooltip({ capacityByAdcode, priceByAdcode, channelTrade }: TooltipProps) {
  const hovered = useMapStore((s) => s.hovered)
  const hoveredChannel = useMapStore((s) => s.hoveredChannel)
  const mousePos = useMapStore((s) => s.mousePos)

  if (hoveredChannel) {
    const ch = hoveredChannel
    const trade = channelTrade?.get(ch.id)
    return (
      <div
        className="pointer-events-none absolute z-20 w-52 rounded-md border border-map-border bg-map-panel/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
        style={{
          left: mousePos.x,
          top: mousePos.y,
          transform: 'translate(-50%, calc(-100% - 14px))',
        }}
      >
        <div className="text-sm font-semibold text-white">{ch.name}</div>
        <div className="mt-0.5 text-[10px] text-slate-500">
          {ch.type === 'DC' ? '特高压直流' : '特高压交流'} · {ch.type === 'DC' ? '±' : ''}
          {ch.voltage_kv}kV
        </div>
        <div className="mt-1.5 space-y-0.5 text-[11px]">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">额定容量</span>
            <span className="font-medium text-white">{formatPower(ch.capacity_mw)}</span>
          </div>
          <div className="flex justify-between gap-3 text-slate-400">
            <span>送端</span>
            <span>{ch.start_point.province}</span>
          </div>
          <div className="flex justify-between gap-3 text-slate-400">
            <span>受端</span>
            <span>{ch.end_point.province}</span>
          </div>
          {trade && (
            <>
              <div className="flex justify-between gap-3 text-slate-400">
                <span>送电均价</span>
                <span>{formatPrice(trade.avg_price_yuan_mwh)}</span>
              </div>
              <div className="flex justify-between gap-3 text-slate-400">
                <span>月送电量</span>
                <span>{formatEnergy(trade.trade_volume_mwh)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

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
