/** 装机量与电源类型相关业务数据类型。 */

export type Indicator = 'capacity' | 'generation' | 'consumption' | 'spot' | 'medium_long' | 'trade'

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

/** 电价数据（元/MWh）。null 表示该月未披露（如河北 1/2/11/12 月现货）。 */
export interface PriceItem {
  province_code: string
  province_name: string
  year: number
  month: number
  spot_avg_yuan_mwh: number | null
  medium_long_avg_yuan_mwh: number | null
  spot_high_yuan_mwh: number | null
  spot_low_yuan_mwh: number | null
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
  spot_avg_yuan_mwh: number | null
  medium_long_avg_yuan_mwh: number | null
  spot_high_yuan_mwh: number | null
  spot_low_yuan_mwh: number | null
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

/** 年度电价聚合（元/MWh）：全年已披露月份的算术平均。 */
export interface AnnualPrice {
  spot_avg: number | null
  mlt_avg: number | null
  /** 参与平均的月份数（0 表示全年未披露）。 */
  spot_months: number
  mlt_months: number
}

/** 跨区域受送电年度连线（flows.json，仅收录省到省的明确年度电量）。 */
export interface ProvinceFlow {
  from_province: string
  from_code: string
  to_province: string
  to_code: string
  volume_gwh: number
  label: string
  source: string
}

export interface FlowsDoc {
  flows: ProvinceFlow[]
}

/** 电网分区价格点（蒙西为逐月现货，蒙东为分电源结算均价）。 */
export interface SubregionPricePoint {
  label: string
  value: number
  volume_gwh?: number | null
}

/** 电网分区（内蒙古"一区两网"：蒙西电网 / 蒙东电网）。 */
export interface SubregionInfo {
  name: string
  capacity_mw?: number | null
  generation_gwh?: number | null
  prices?: SubregionPricePoint[]
}

/** 省份电量（GWh）：发电量 / 用电量 / 跨省受送；month=0 为年度汇总。null = 未披露。 */
export interface EnergyItem {
  province_code: string
  province_name: string
  year: number
  month: number
  generation_gwh: number | null
  consumption_gwh: number | null
  /** 跨省受入电量。 */
  received_gwh: number | null
  /** 跨省送出电量。 */
  sent_gwh: number | null
  gen_thermal_gwh: number | null
  gen_hydro_gwh: number | null
  gen_wind_gwh: number | null
  gen_pv_gwh: number | null
  gen_nuclear_gwh: number | null
  source_url: string | null
  /** 电网分区（仅内蒙古等"一区两网"省份有值）。 */
  subregions?: SubregionInfo[]
  /** 年度补充统计（如净输出电量、外送能力等，value 为已含单位的展示字符串）。 */
  extra_stats?: { label: string; value: string }[]
  /** 燃煤发电基准价（元/MWh）。 */
  benchmark_price_yuan_mwh?: number | null
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
