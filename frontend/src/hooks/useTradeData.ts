import { useEffect, useMemo, useState } from 'react'
import type { TradeItem } from '@/types/data'
import { useDataStore } from '@/stores/dataStore'
import { fetchJson } from '@/utils/staticData'

export interface TradeData {
  /** channel_id -> 当月交易记录。 */
  byChannel: Map<string, TradeItem>
  list: TradeItem[]
}

/** 某月省间交易（静态 /data/trade.json，客户端按年月过滤）。active 为 false 时不返回数据。 */
export function useTradeData(active: boolean): {
  data: TradeData | null
  loading: boolean
  error: Error | null
} {
  const year = useDataStore((s) => s.year)
  const month = useDataStore((s) => s.month)
  const [items, setItems] = useState<TradeItem[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    fetchJson<{ items: TradeItem[] }>('/data/trade.json')
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

  const data = useMemo<TradeData | null>(() => {
    if (!items || !active) return null
    const filtered = items.filter((i) => i.year === year && i.month === month)
    const byChannel = new Map<string, TradeItem>()
    for (const it of filtered) if (it.channel_id) byChannel.set(it.channel_id, it)
    return { byChannel, list: filtered }
  }, [items, active, year, month])

  return { data, loading: items === null && !error, error }
}
