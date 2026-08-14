import { create } from 'zustand'
import type { Indicator } from '@/types/data'

/** 可选年份（mock 数据覆盖 2024/2025）。 */
export const AVAILABLE_YEARS = [2025, 2024]

interface DataState {
  /** 当前指标（Phase 2 仅 capacity）。 */
  indicator: Indicator
  year: number
  /** 0 = 年度汇总。 */
  month: number
  setIndicator: (indicator: Indicator) => void
  setYear: (year: number) => void
  setMonth: (month: number) => void
}

export const useDataStore = create<DataState>((set) => ({
  indicator: 'capacity',
  year: 2025,
  month: 0,
  setIndicator: (indicator) => set({ indicator }),
  setYear: (year) => set({ year }),
  setMonth: (month) => set({ month }),
}))
