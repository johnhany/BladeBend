import { create } from 'zustand'
import type { Indicator } from '@/types/data'

/** 可选年份（当前各省数据均为 2025 年度）。 */
export const AVAILABLE_YEARS = [2025]
/** 可选月份 1-12（仅电价指标使用；装机为年度汇总）。 */
export const AVAILABLE_MONTHS = Array.from({ length: 12 }, (_, i) => 12 - i)

interface DataState {
  /** 当前指标。 */
  indicator: Indicator
  year: number
  /** 月份 1-12（仅电价指标使用；装机固定取年度汇总 month=0）。 */
  month: number
  setIndicator: (indicator: Indicator) => void
  setYear: (year: number) => void
  setMonth: (month: number) => void
}

export const useDataStore = create<DataState>((set) => ({
  indicator: 'capacity',
  year: 2025,
  month: 12,
  setIndicator: (indicator) => set({ indicator }),
  setYear: (year) => set({ year }),
  setMonth: (month) => set({ month }),
}))
