import { useEffect, useState } from 'react'
import type { PriceHistoryPoint, PriceHistoryResponse } from '@/types/data'

/** 加载某省最近 N 个月电价（时间升序）。code 为 null 时清空。 */
export function usePriceHistory(
  code: string | null,
  months = 12,
): {
  points: PriceHistoryPoint[] | null
  loading: boolean
  error: Error | null
} {
  const [points, setPoints] = useState<PriceHistoryPoint[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!code) {
      setPoints(null)
      return
    }
    let alive = true
    setLoading(true)
    fetch(`/api/price/history?province_code=${code}&months=${months}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<PriceHistoryResponse>
      })
      .then((res) => {
        if (!alive) return
        setPoints(res.data)
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
  }, [code, months])

  return { points, loading, error }
}
