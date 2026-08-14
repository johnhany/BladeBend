/** 装机量与电源类型相关业务数据类型。 */

export type Indicator = 'capacity' | 'spot' | 'medium_long' | 'trade'

export interface CapacityItem {
  province_code: string
  province_name: string
  year: number
  month: number
  thermal_mw: number
  hydro_mw: number
  wind_mw: number
  pv_mw: number
  nuclear_mw: number
  other_mw: number
  total_mw: number
  source_url: string | null
  updated_at: string | null
}

export interface CapacitySummary {
  national_total_mw: number
  thermal_ratio: number
  renewable_ratio: number
}

export interface CapacityResponse {
  data: CapacityItem[]
  total: number
  summary: CapacitySummary
}

/** 电源类型字段键。 */
export type SourceKey = 'thermal_mw' | 'hydro_mw' | 'wind_mw' | 'pv_mw' | 'nuclear_mw' | 'other_mw'

/** 电源类型元数据（名称、颜色），参考 SDD §3.6。 */
export interface SourceMeta {
  key: SourceKey
  label: string
  color: string
}

export const SOURCE_META: SourceMeta[] = [
  { key: 'thermal_mw', label: '火电', color: '#e15759' },
  { key: 'hydro_mw', label: '水电', color: '#4e79a7' },
  { key: 'wind_mw', label: '风电', color: '#59a14f' },
  { key: 'pv_mw', label: '光伏', color: '#f1c63b' },
  { key: 'nuclear_mw', label: '核电', color: '#b07aa1' },
  { key: 'other_mw', label: '其它', color: '#9c9c9c' },
]
