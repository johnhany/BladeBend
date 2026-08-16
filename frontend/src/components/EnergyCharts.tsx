import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { EnergyItem } from '@/types/data'

interface EnergyChartsProps {
  annual: EnergyItem | null
  months: EnergyItem[]
}

const TOOLTIP = {
  backgroundColor: '#0f1e33',
  borderColor: '#1e3350',
  textStyle: { color: '#cbd5e1', fontSize: 10 },
}

/** 电量图表：逐月发电/用电柱线图 + 年度发电结构环图。 */
export function EnergyCharts({ annual, months }: EnergyChartsProps) {
  // 1) 逐月发电量（柱）与用电量（线）
  const monthOption: EChartsOption = {
    animation: false,
    grid: { left: 42, right: 14, top: 26, bottom: 24 },
    legend: {
      top: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: '#94a3b8', fontSize: 10 },
    },
    xAxis: {
      type: 'category',
      data: months.map((m) => `${m.month}月`),
      axisLabel: { color: '#64748b', fontSize: 9 },
      axisLine: { lineStyle: { color: '#1e3350' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'GWh',
      nameTextStyle: { color: '#64748b', fontSize: 9 },
      axisLabel: { color: '#64748b', fontSize: 9 },
      splitLine: { lineStyle: { color: '#14243b' } },
    },
    series: [
      {
        name: '发电量',
        type: 'bar',
        data: months.map((m) => m.generation_gwh),
        itemStyle: { color: '#f59e0b' },
        barWidth: '45%',
      },
      {
        name: '用电量',
        type: 'line',
        data: months.map((m) => m.consumption_gwh),
        itemStyle: { color: '#60a5fa' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 4,
      },
    ],
    tooltip: {
      trigger: 'axis',
      ...TOOLTIP,
      valueFormatter: (v) => (v == null ? '—' : `${Number(v).toLocaleString()} GWh`),
    },
  }

  // 2) 年度发电结构环图
  const sources = [
    { name: '火电', value: annual?.gen_thermal_gwh, color: '#e15759' },
    { name: '水电', value: annual?.gen_hydro_gwh, color: '#4e79a7' },
    { name: '风电', value: annual?.gen_wind_gwh, color: '#59a14f' },
    { name: '光伏', value: annual?.gen_pv_gwh, color: '#f1c63b' },
  ].filter((s) => s.value != null)
  const structureOption: EChartsOption = {
    animation: false,
    series: [
      {
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['28%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#0a1628', borderWidth: 1.5 },
        label: { show: false },
        data: sources.map((s) => ({
          name: s.name,
          value: s.value as number,
          itemStyle: { color: s.color },
        })),
      },
    ],
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'center',
      itemWidth: 10,
      itemHeight: 8,
      textStyle: { color: '#94a3b8', fontSize: 10 },
    },
    tooltip: { ...TOOLTIP, valueFormatter: (v) => `${Number(v).toLocaleString()} GWh` },
  }

  return (
    <>
      {months.length > 0 && (
        <>
          <h4 className="mb-1 text-[10px] text-slate-500">逐月电量（未披露月份不显示）</h4>
          <ReactECharts option={monthOption} style={{ height: 160 }} />
        </>
      )}
      {sources.length > 0 && (
        <>
          <h4 className="mb-1 mt-2 text-[10px] text-slate-500">发电结构（年度）</h4>
          <ReactECharts option={structureOption} style={{ height: 110 }} />
        </>
      )}
    </>
  )
}
