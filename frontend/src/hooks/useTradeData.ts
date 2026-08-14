import { useEffect, useState } from 'react'
import type { TradeItem, TradeResponse } from '@/types/data'
import { useDataStore } from '@/stores/dataStore'

export interface TradeData {
  /** channel_id -> 当月交易记录。 */
  byChannel: Map<string, TradeItem>
  list: TradeItem[]
}

/** 加载某月省间交易。active 为 null 时不请求。 */
export function useTradeData(active: boolean): {
  data: TradeData | null
  loading: boolean
  error: Error | null
} {
  const year = useDataStore((s) => s.year)
  const month = useDataStore((s) => s.month)
  const [data, setData] = useState<TradeData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!active) {
      setData(null)
      return
    }
    let alive = true
    setLoading(true)
    fetch(`/api/trade?year=${year}&month=${month}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<TradeResponse>
      })
      .then((res) => {
        if (!alive) return
        const byChannel = new Map<string, TradeItem>()
        for (const it of res.data) if (it.channel_id) byChannel.set(it.channel_id, it)
        setData({ byChannel, list: res.data })
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
  }, [active, year, month])

  return { data, loading, error }
}
