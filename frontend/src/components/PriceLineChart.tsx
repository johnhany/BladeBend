import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { PriceHistoryPoint } from '@/types/data'

/** 省份电价时序折线图：现货(红实线) + 中长期(蓝虚线)，异常点以图钉标注（SDD §3.6）。 */
export function PriceLineChart({ points }: { points: PriceHistoryPoint[] }) {
  const labels = points.map((p) => `${p.year}-${String(p.month).padStart(2, '0')}`)
  const anomalyIdx = points.map((p, i) => (p.is_anomaly ? i : -1)).filter((i) => i >= 0)

  const option: EChartsOption = {
    animation: false,
    grid: { left: 42, right: 14, top: 26, bottom: 42 },
    legend: {
      top: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: '#94a3b8', fontSize: 10 },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: '#64748b', fontSize: 9, rotate: 45, interval: 1 },
      axisLine: { lineStyle: { color: '#1e3350' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: '元/MWh',
      nameTextStyle: { color: '#64748b', fontSize: 9 },
      axisLabel: { color: '#64748b', fontSize: 9 },
      splitLine: { lineStyle: { color: '#14243b' } },
    },
    series: [
      {
        name: '现货均价',
        type: 'line',
        data: points.map((p) => p.spot_avg_yuan_mwh),
        itemStyle: { color: '#e15759' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 4,
        markPoint:
          anomalyIdx.length > 0
            ? {
                symbol: 'pin',
                symbolSize: 32,
                itemStyle: { color: '#f59e0b' },
                label: {
                  show: true,
                  formatter: '!',
                  color: '#1c1917',
                  fontSize: 11,
                  fontWeight: 'bold',
                },
                data: anomalyIdx.map((i) => ({
                  name: `异常${i}`,
                  coord: [labels[i], points[i].spot_avg_yuan_mwh],
                })),
              }
            : undefined,
      },
      {
        name: '中长期均价',
        type: 'line',
        data: points.map((p) => p.medium_long_avg_yuan_mwh),
        itemStyle: { color: '#4e79a7' },
        lineStyle: { width: 2, type: 'dashed' },
        symbol: 'none',
      },
    ],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f1e33',
      borderColor: '#1e3350',
      textStyle: { color: '#cbd5e1', fontSize: 10 },
      valueFormatter: (v) => `${Number(v).toFixed(1)} 元/MWh`,
    },
  }

  return <ReactECharts option={option} style={{ height: 210 }} />
}
