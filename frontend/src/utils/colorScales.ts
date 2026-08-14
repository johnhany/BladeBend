import { interpolateViridis, quantile, scaleSequentialLog, scaleThreshold } from 'd3'
import { SOURCE_META, type SourceKey } from '@/types/data'

/** 无数据省份的填充色（区别于地图背景）。 */
export const NO_DATA_COLOR = '#1e2d47'

/**
 * 装机量分级设色（参考 SDD §3.2：蓝-绿-黄，interpolateViridis）。
 * 由于省间装机量跨数量级（澳门 ~1GW ↔ 内蒙古 ~260GW），使用对数比例尺。
 */
export function makeCapacityScale(domain: [number, number]) {
  const [lo, hi] = domain
  return scaleSequentialLog(interpolateViridis).domain([Math.max(lo, 1), hi])
}

/** 功率单位格式化（PRD §2.2：<1000 用 MW，≥1000 用 GW）。 */
export function formatPower(mw: number): string {
  if (Math.abs(mw) >= 1000) return `${Number((mw / 1000).toFixed(1))} GW`
  return `${Math.round(mw)} MW`
}

/** 电量单位格式化（<1,000,000 用 MWh，≥1,000,000 用 GWh）。 */
export function formatEnergy(mwh: number): string {
  if (Math.abs(mwh) >= 1_000_000) return `${Number((mwh / 1000).toFixed(1))} GWh`
  return `${Math.round(mwh)} MWh`
}

/** 占比百分比。 */
export function formatRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

export function sourceColor(key: SourceKey): string {
  return SOURCE_META.find((s) => s.key === key)?.color ?? '#9c9c9c'
}

// 电价分级设色（参考 SDD §3.2：现货 白-橙-红、中长期 白-蓝-紫，阈值比例尺）
export const SPOT_PRICE_COLORS = ['#efe9e2', '#f6c2a0', '#f09356', '#dd5a1f', '#8c2d04']
export const MLT_PRICE_COLORS = ['#eceaf4', '#c3bde0', '#9a8fce', '#6a51a3', '#3d0163']

/**
 * 按数据分位数计算阈值断点（取整到 10 元），返回阈值比例尺及断点/色带（供图例使用）。
 */
export function makePriceThresholdScale(values: number[], kind: 'spot' | 'medium_long') {
  const colors = kind === 'spot' ? SPOT_PRICE_COLORS : MLT_PRICE_COLORS
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  let thresholds: number[] = []
  if (sorted.length >= 5) {
    thresholds = [0.2, 0.4, 0.6, 0.8]
      .map((q) => quantile(sorted, q) as number)
      .map((v) => Math.round(v / 10) * 10)
      .filter((v, i, arr) => arr.indexOf(v) === i && v > (arr[i - 1] ?? -Infinity))
  }
  const range = colors.slice(0, thresholds.length + 1)
  const scale = scaleThreshold(thresholds, range)
  return { scale, thresholds, colors: range }
}

/** 电价格式化。 */
export function formatPrice(v: number): string {
  return `${v.toFixed(0)} 元/MWh`
}
