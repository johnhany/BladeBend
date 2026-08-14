import { interpolateViridis, scaleSequentialLog } from 'd3'
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
