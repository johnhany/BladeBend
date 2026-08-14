import { useEffect, useState } from 'react'
import type { CapacityItem, CapacityResponse, CapacitySummary } from '@/types/data'
import { useDataStore } from '@/stores/dataStore'

export interface CapacityData {
  /** adcode -> 装机数据，供省份 O(1) 查询。 */
  byAdcode: Map<string, CapacityItem>
  summary: CapacitySummary
}

export function useCapacityData(): {
  data: CapacityData | null
  loading: boolean
  error: Error | null
} {
  const year = useDataStore((s) => s.year)
  const month = useDataStore((s) => s.month)
  const [data, setData] = useState<CapacityData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const params = new URLSearchParams({ year: String(year) })
    if (month) params.set('month', String(month))
    fetch(`/api/capacity?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<CapacityResponse>
      })
      .then((res) => {
        if (!alive) return
        const byAdcode = new Map<string, CapacityItem>()
        for (const it of res.data) byAdcode.set(it.province_code, it)
        setData({ byAdcode, summary: res.summary })
        setError(null)
        setLoading(false)
      })
      .catch((e) => {
        if (!alive) return
        setError(e instanceof Error ? e : new Error(String(e)))
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [year, month])

  return { data, loading, error }
}
