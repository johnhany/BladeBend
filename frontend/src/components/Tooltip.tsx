import { useMapStore } from '@/stores/mapStore'
import { formatEnergyGwh, formatPower, formatPrice } from '@/utils/colorScales'
import { isMockSource } from '@/utils/dataSource'
import type { AnnualPrice, CapacityItem, Channel, EnergyItem } from '@/types/data'

interface TooltipProps {
  capacityByAdcode?: Map<string, CapacityItem>
  annualPriceByAdcode?: Map<string, AnnualPrice>
  energyAnnualByAdcode?: Map<string, EnergyItem>
}

/** 悬停提示框：跨区域连线 > 输电通道 > 省份（年度口径 7 项指标）。 */
export function Tooltip({
  capacityByAdcode,
  annualPriceByAdcode,
  energyAnnualByAdcode,
}: TooltipProps) {
  const hovered = useMapStore((s) => s.hovered)
  const hoveredChannel = useMapStore((s) => s.hoveredChannel)
  const hoveredFlow = useMapStore((s) => s.hoveredFlow)
  const mousePos = useMapStore((s) => s.mousePos)

  const shell = (children: React.ReactNode, width: string) => (
    <div
      className={`pointer-events-none absolute z-20 ${width} rounded-md border border-map-border bg-map-panel/95 px-3 py-2 text-xs shadow-xl backdrop-blur`}
      style={{
        left: mousePos.x,
        top: mousePos.y,
        transform: 'translate(-50%, calc(-100% - 14px))',
      }}
    >
      {children}
    </div>
  )

  // 1) 跨区域受送电连线
  if (hoveredFlow) {
    const f = hoveredFlow
    return shell(
      <>
        <div className="text-sm font-semibold text-white">
          {f.from_province} → {f.to_province}
        </div>
        <div className="mt-0.5 text-[10px] text-slate-500">{f.label}</div>
        <div className="mt-1.5 space-y-0.5 text-[11px]">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">年度输送电量</span>
            <span className="font-medium text-white">{formatEnergyGwh(f.volume_gwh)}</span>
          </div>
        </div>
      </>,
      'w-52',
    )
  }

  // 2) 输电通道
  if (hoveredChannel) {
    const ch: Channel = hoveredChannel
    return shell(
      <>
        <div className="text-sm font-semibold text-white">{ch.name}</div>
        <div className="mt-0.5 text-[10px] text-slate-500">
          {ch.type === 'DC' ? '直流' : '交流'} · {ch.type === 'DC' ? '±' : ''}
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
        </div>
      </>,
      'w-52',
    )
  }

  // 3) 省份（年度口径）
  if (!hovered) return null

  const code = String(hovered.properties?.adcode ?? '')
  const name = hovered.properties?.name ?? '未知'
  const cap = capacityByAdcode?.get(code)
  const ap = annualPriceByAdcode?.get(code)
  const en = energyAnnualByAdcode?.get(code)
  const hasAny = cap || ap || en

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  )
  const avg = (v: number | null, n: number) =>
    v == null ? (
      '—'
    ) : (
      <>
        {formatPrice(v)}
        {n > 0 && n < 12 && <span className="ml-1 text-[9px] text-slate-600">{n}月均</span>}
      </>
    )

  return shell(
    <>
      <div className="text-sm font-semibold text-white">{name}</div>
      <div className="mt-1.5 space-y-0.5 text-[11px]">
        {cap &&
          row(
            '总装机',
            <span className="font-medium text-white">{formatPower(cap.total_mw)}</span>,
          )}
        {row('年度现货均价', avg(ap?.spot_avg ?? null, ap?.spot_months ?? 0))}
        {row('年度中长期均价', avg(ap?.mlt_avg ?? null, ap?.mlt_months ?? 0))}
        {row('年度总发电量', en?.generation_gwh != null ? formatEnergyGwh(en.generation_gwh) : '—')}
        {row(
          '年度总用电量',
          en?.consumption_gwh != null ? formatEnergyGwh(en.consumption_gwh) : '—',
        )}
        {row('年度总外送电量', en?.sent_gwh != null ? formatEnergyGwh(en.sent_gwh) : '—')}
        {row('年度总收入电量', en?.received_gwh != null ? formatEnergyGwh(en.received_gwh) : '—')}
        {!hasAny && <div className="text-slate-500">暂无数据</div>}
        {((cap && isMockSource(cap.source_url)) || (en && isMockSource(en.source_url))) && (
          <div className="mt-0.5 text-[9px] text-slate-600">· 模拟数据</div>
        )}
      </div>
    </>,
    'w-56',
  )
}
