import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { formatPower, formatPrice } from '@/utils/colorScales'
import type { CapacityItem, PriceItem } from '@/types/data'
import type { ProvinceFeature } from '@/types/geo'

interface ComparisonViewProps {
  features: ProvinceFeature[]
  capacityByAdcode?: Map<string, CapacityItem>
  priceByAdcode?: Map<string, PriceItem>
}

function nameOf(f: ProvinceFeature): string {
  return (f.properties?.name as string) ?? ''
}
function codeOf(f: ProvinceFeature): string {
  return String(f.properties?.adcode ?? '')
}

/** 多省并列对比视图（Ctrl+点击 ≥2 省时启用，PRD §3.1.2）。 */
export function ComparisonView({ features, capacityByAdcode, priceByAdcode }: ComparisonViewProps) {
  const rows = features.map((f) => {
    const code = codeOf(f)
    return {
      name: nameOf(f),
      cap: capacityByAdcode?.get(code),
      price: priceByAdcode?.get(code),
    }
  })

  const capRows = rows.filter((r) => r.cap)
  const barOption: EChartsOption = {
    animation: false,
    grid: { left: 4, right: 34, top: 6, bottom: 22, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: {
        color: '#64748b',
        fontSize: 9,
        formatter: (v: number) => formatPower(v),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#14243b' } },
    },
    yAxis: {
      type: 'category',
      data: capRows.map((r) => r.name),
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: capRows.map((r) => r.cap!.total_mw),
        itemStyle: { color: '#3b82f6' },
        barWidth: '60%',
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          fontSize: 9,
          formatter: (p: { value?: unknown }) => formatPower(Number(p.value)),
        },
      },
    ],
    tooltip: {
      backgroundColor: '#0f1e33',
      borderColor: '#1e3350',
      textStyle: { color: '#cbd5e1', fontSize: 10 },
      valueFormatter: (v) => formatPower(Number(v)),
    },
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-300">装机对比</h3>
        <span className="text-[10px] text-slate-500">{rows.length} 省</span>
      </div>
      {capRows.length > 0 && (
        <ReactECharts option={barOption} style={{ height: 34 * capRows.length + 30 }} />
      )}

      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.name} className="rounded border border-map-border/60 px-2 py-1.5">
            <div className="text-xs font-medium text-slate-200">{r.name}</div>
            <div className="mt-0.5 grid grid-cols-2 gap-x-2 text-[10px]">
              <span className="text-slate-500">
                总装机{' '}
                <span className="text-slate-300">{r.cap ? formatPower(r.cap.total_mw) : '—'}</span>
              </span>
              <span className="text-slate-500">
                现货{' '}
                <span className="text-slate-300">
                  {r.price ? formatPrice(r.price.spot_avg_yuan_mwh) : '—'}
                </span>
              </span>
              <span className="text-slate-500">
                中长期{' '}
                <span className="text-slate-300">
                  {r.price ? formatPrice(r.price.medium_long_avg_yuan_mwh) : '—'}
                </span>
              </span>
              {r.price?.is_anomaly && (
                <span className="text-amber-500">⚠ {r.price.anomaly_reason}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
