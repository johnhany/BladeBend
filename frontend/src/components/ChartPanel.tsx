import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { formatPower } from '@/utils/colorScales'
import { SOURCE_META, type CapacityItem } from '@/types/data'

interface ChartPanelProps {
  item: CapacityItem
}

/** 省份装机结构图：堆叠柱状图 / 环形图切换。 */
export function ChartPanel({ item }: ChartPanelProps) {
  const [mode, setMode] = useState<'bar' | 'pie'>('bar')
  const sources = SOURCE_META.map((s) => ({ ...s, value: item[s.key] }))
  const total = sources.reduce((a, s) => a + s.value, 0)

  const barOption: EChartsOption = {
    animation: false,
    grid: { left: 4, right: 8, top: 6, bottom: 4, containLabel: false },
    xAxis: {
      type: 'value',
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: [''],
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: sources.map((s) => ({
      name: s.label,
      type: 'bar',
      stack: 'total',
      data: [s.value],
      itemStyle: { color: s.color },
      barWidth: '70%',
      emphasis: { focus: 'series' },
    })),
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => formatPower(Number(v)),
      backgroundColor: '#0f1e33',
      borderColor: '#1e3350',
      textStyle: { color: '#cbd5e1' },
    },
  }

  const pieOption: EChartsOption = {
    animation: false,
    series: [
      {
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#0a1628', borderWidth: 1.5 },
        label: { show: false },
        data: sources.map((s) => ({
          name: s.label,
          value: s.value,
          itemStyle: { color: s.color },
        })),
      },
    ],
    tooltip: {
      valueFormatter: (v) => formatPower(Number(v)),
      backgroundColor: '#0f1e33',
      borderColor: '#1e3350',
      textStyle: { color: '#cbd5e1' },
    },
  }

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-300">
          装机结构 <span className="text-slate-500">· {formatPower(total)}</span>
        </h3>
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'bar' ? 'pie' : 'bar'))}
          className="rounded border border-map-border px-1.5 py-0.5 text-[10px] text-slate-400 hover:border-map-accent hover:text-slate-200"
        >
          {mode === 'bar' ? '环形图' : '柱状图'}
        </button>
      </div>
      <ReactECharts
        key={mode}
        option={mode === 'bar' ? barOption : pieOption}
        style={{ height: 120 }}
      />
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        {sources.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="text-slate-300">
              {formatPower(s.value)}
              <span className="ml-1 text-slate-600">{((s.value / total) * 100).toFixed(0)}%</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
