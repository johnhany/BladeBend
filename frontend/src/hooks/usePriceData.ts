import { useEffect, useState } from 'react'
import type { PriceItem, PriceResponse } from '@/types/data'
import { useDataStore } from '@/stores/dataStore'

export interface PriceData {
  byAdcode: Map<string, PriceItem>
}

/**
 * 加载某月全部省份电价。activeType 为 null 时不请求（装机指标下不拉电价）。
 */
export function usePriceData(activeType: 'spot' | 'medium_long' | null): {
  data: PriceData | null
  loading: boolean
  error: Error | null
} {
  const year = useDataStore((s) => s.year)
  const month = useDataStore((s) => s.month)
  const [data, setData] = useState<PriceData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeType) {
      setData(null)
      return
    }
    let alive = true
    setLoading(true)
    fetch(`/api/price?year=${year}&month=${month}&type=${activeType}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<PriceResponse>
      })
      .then((res) => {
        if (!alive) return
        const byAdcode = new Map<string, PriceItem>()
        for (const it of res.data) byAdcode.set(it.province_code, it)
        setData({ byAdcode })
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
  }, [activeType, year, month])

  return { data, loading, error }
}
