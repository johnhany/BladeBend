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

/** 电价数据（元/MWh）。 */
export interface PriceItem {
  province_code: string
  province_name: string
  year: number
  month: number
  spot_avg_yuan_mwh: number
  medium_long_avg_yuan_mwh: number
  spot_high_yuan_mwh: number
  spot_low_yuan_mwh: number
  is_anomaly: boolean
  anomaly_reason: string | null
  source_url: string | null
}

export interface PriceResponse {
  data: PriceItem[]
  total: number
}

export interface PriceHistoryPoint {
  year: number
  month: number
  spot_avg_yuan_mwh: number
  medium_long_avg_yuan_mwh: number
  spot_high_yuan_mwh: number
  spot_low_yuan_mwh: number
  is_anomaly: boolean
  anomaly_reason: string | null
}

export interface PriceHistoryResponse {
  province_code: string
  province_name: string
  data: PriceHistoryPoint[]
}

/** 输电通道（data/channels.json，PRD §4.3 格式）。 */
export interface ChannelPoint {
  name: string
  province: string
  lat: number
  lng: number
}

export interface Channel {
  id: string
  name: string
  type: 'DC' | 'AC'
  voltage_kv: number
  capacity_mw: number
  start_point: ChannelPoint
  end_point: ChannelPoint
  commissioning_date?: string
  status: string
  notes?: string
}

export interface ChannelsResponse {
  data: Channel[]
  total: number
}

/** 省间交易。 */
export interface TradeItem {
  from_province_code: string
  from_province_name: string
  to_province_code: string
  to_province_name: string
  year: number
  month: number
  avg_price_yuan_mwh: number
  trade_volume_mwh: number
  channel_id: string | null
}

export interface TradeResponse {
  data: TradeItem[]
  total: number
}

/** 城市（省会 + 主要负荷中心）。 */
export interface City {
  name: string
  province: string
  lat: number
  lng: number
  /** 最大用电负荷（万kW），用于点位大小映射。 */
  load: number
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
