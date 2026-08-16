import { useEffect, useMemo, useState } from 'react'
import type { PriceHistoryPoint, PriceItem } from '@/types/data'
import { fetchJson } from '@/utils/staticData'

/** 某省最近 N 个月电价（时间升序）。code 为 null 时返回 null。 */
export function usePriceHistory(
  code: string | null,
  months = 12,
): {
  points: PriceHistoryPoint[] | null
  loading: boolean
  error: Error | null
} {
  const [items, setItems] = useState<PriceItem[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    fetchJson<{ items: PriceItem[] }>('/data/price.json')
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

  const points = useMemo<PriceHistoryPoint[] | null>(() => {
    if (!items) return null
    if (!code) return null
    return items
      .filter((i) => i.province_code === code)
      .sort((a, b) => b.year - a.year || b.month - a.month)
      .slice(0, months)
      .reverse()
      .map((i) => ({
        year: i.year,
        month: i.month,
        spot_avg_yuan_mwh: i.spot_avg_yuan_mwh,
        medium_long_avg_yuan_mwh: i.medium_long_avg_yuan_mwh,
        spot_high_yuan_mwh: i.spot_high_yuan_mwh,
        spot_low_yuan_mwh: i.spot_low_yuan_mwh,
        is_anomaly: i.is_anomaly,
        anomaly_reason: i.anomaly_reason,
      }))
  }, [items, code, months])

  return { points, loading: items === null && !error, error }
}
