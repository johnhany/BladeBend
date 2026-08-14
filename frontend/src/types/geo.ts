import type { Feature, FeatureCollection, Geometry } from 'geojson'

/** 省级行政区属性。DataV 数据中 adcode 为数值，南海诸岛为字符串 "100000_JD"。 */
export interface ProvinceProperties {
  adcode: number | string
  name: string
  [key: string]: unknown
}

export type ProvinceFeature = Feature<Geometry, ProvinceProperties>
export type ProvinceFeatureCollection = FeatureCollection<Geometry, ProvinceProperties>

/** 统一取 adcode 的字符串形式，便于比较。 */
export function adcodeOf(
  feature: { properties?: { adcode?: number | string } } | undefined | null,
): string {
  return String(feature?.properties?.adcode ?? '')
}

/** 南海诸岛 / 九段线要素的 adcode 标识（DataV 中为 "100000_JD"）。 */
export const SOUTH_CHINA_SEA_ADCODE = '100000_JD'
