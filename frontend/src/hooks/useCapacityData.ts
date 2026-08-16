import { useEffect, useMemo, useState } from 'react'
import type { CapacityItem } from '@/types/data'
import { useDataStore } from '@/stores/dataStore'
import { fetchJson } from '@/utils/staticData'

export interface CapacityData {
  /** adcode -> 装机数据，供省份 O(1) 查询。 */
  byAdcode: Map<string, CapacityItem>
  summary: {
    national_total_mw: number
    thermal_ratio: number
    renewable_ratio: number
  }
}

/** 装机数据（静态 /data/capacity.json），按年份过滤（年度汇总 month=0）。 */
export function useCapacityData(): {
  data: CapacityData | null
  loading: boolean
  error: Error | null
} {
  const year = useDataStore((s) => s.year)
  const [items, setItems] = useState<CapacityItem[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    fetchJson<{ items: CapacityItem[] }>('/data/capacity.json')
      .then((d) => {
        if (alive) setItems(d.items)
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      alive = false
    }
  }, [])

  const data = useMemo<CapacityData | null>(() => {
    if (!items) return null
    const filtered = items.filter((i) => i.year === year && i.month === 0)
    const byAdcode = new Map<string, CapacityItem>()
    for (const it of filtered) byAdcode.set(it.province_code, it)
    const nationalTotal = filtered.reduce((a, i) => a + i.total_mw, 0)
    const thermal = filtered.reduce((a, i) => a + i.thermal_mw, 0)
    const renewable = filtered.reduce((a, i) => a + i.hydro_mw + i.wind_mw + i.pv_mw, 0)
    const round4 = (v: number) => Math.round(v * 10000) / 10000
    return {
      byAdcode,
      summary: {
        national_total_mw: nationalTotal,
        thermal_ratio: nationalTotal ? round4(thermal / nationalTotal) : 0,
        renewable_ratio: nationalTotal ? round4(renewable / nationalTotal) : 0,
      },
    }
  }, [items, year])

  return { data, loading: items === null && !error, error }
}
