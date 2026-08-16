import { formatPower, formatRatio } from '@/utils/colorScales'
import { isMockSource } from '@/utils/dataSource'
import { SOURCE_META, type CapacityItem, type CapacitySummary } from '@/types/data'

interface SummaryCardProps {
  summary: CapacitySummary
  items: CapacityItem[]
  year: number
}

/** 全国概览卡片：总装机 + 各类电源占比。 */
export function SummaryCard({ summary, items, year }: SummaryCardProps) {
  const mockCount = items.filter((i) => isMockSource(i.source_url)).length
  const totals = SOURCE_META.map((s) => ({ ...s, value: 0 }))
  for (const it of items) {
    for (const t of totals) t.value += it[t.key]
  }
  const nationalTotal = totals.reduce((a, t) => a + t.value, 0) || summary.national_total_mw

  return (
    <div className="absolute left-5 top-16 z-10 w-60 rounded-md border border-map-border bg-map-panel/85 px-3 py-3 backdrop-blur">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-slate-300">全国装机概览</span>
        <span className="text-[10px] text-slate-500">{year} 年</span>
      </div>
      <div className="mt-1 text-2xl font-semibold text-white">{formatPower(nationalTotal)}</div>

      {/* 各类电源占比堆叠条 */}
      <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded">
        {totals.map((t) => (
          <div
            key={t.key}
            title={`${t.label} ${formatPower(t.value)}`}
            style={{ width: `${(t.value / nationalTotal) * 100}%`, background: t.color }}
          />
        ))}
      </div>

      {/* 明细 */}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
        {totals.map((t) => (
          <div key={t.key} className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: t.color }} />
              {t.label}
            </span>
            <span className="text-slate-300">{((t.value / nationalTotal) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-between border-t border-map-border pt-1.5 text-[10px] text-slate-400">
        <span>火电 {formatRatio(summary.thermal_ratio)}</span>
        <span>可再生 {formatRatio(summary.renewable_ratio)}</span>
      </div>

      {mockCount > 0 && (
        <div className="mt-1 text-[9px] text-slate-600">
          含 {mockCount}/{items.length} 省模拟数据（待真实数据替换）
        </div>
      )}
    </div>
  )
}
