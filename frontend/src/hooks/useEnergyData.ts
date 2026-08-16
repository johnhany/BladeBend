import { useEffect, useMemo, useState } from 'react'
import type { EnergyItem } from '@/types/data'
import { useDataStore } from '@/stores/dataStore'
import { fetchJson } from '@/utils/staticData'

export interface EnergyData {
  /** 年度汇总（month=0），无则 null。 */
  annual: EnergyItem | null
  /** 逐月记录（month≥1，升序）。 */
  months: EnergyItem[]
}

/** 全部省份年度电量（month=0）映射，按年份过滤。供地图着色与悬停使用。 */
export function useEnergyAnnual(): {
  byAdcode: Map<string, EnergyItem> | null
  loading: boolean
  error: Error | null
} {
  const year = useDataStore((s) => s.year)
  const [items, setItems] = useState<EnergyItem[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    fetchJson<{ items: EnergyItem[] }>('/data/energy.json')
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

  const byAdcode = useMemo(() => {
    if (!items) return null
    const m = new Map<string, EnergyItem>()
    for (const it of items) {
      if (it.year === year && it.month === 0) m.set(it.province_code, it)
    }
    return m
  }, [items, year])

  return { byAdcode, loading: items === null && !error, error }
}

/** 某省电量数据（静态 /data/energy.json，按年份过滤）。code 为 null 时返回空。 */
export function useEnergyData(code: string | null): {
  data: EnergyData | null
  loading: boolean
  error: Error | null
} {
  const year = useDataStore((s) => s.year)
  const [items, setItems] = useState<EnergyItem[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    fetchJson<{ items: EnergyItem[] }>('/data/energy.json')
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

  const data = useMemo<EnergyData | null>(() => {
    if (!items || !code) return null
    const rows = items.filter((i) => i.province_code === code && i.year === year)
    return {
      annual: rows.find((i) => i.month === 0) ?? null,
      months: rows.filter((i) => i.month >= 1).sort((a, b) => a.month - b.month),
    }
  }, [items, code, year])

  return { data, loading: items === null && !error, error }
}
