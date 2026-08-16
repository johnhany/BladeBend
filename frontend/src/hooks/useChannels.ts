import { useEffect, useState } from 'react'
import type { Channel } from '@/types/data'
import { fetchJson } from '@/utils/staticData'

/** 加载输电通道静态数据（/data/channels.json，由 scripts/parse_channels.py 生成）。 */
export function useChannels(): { data: Channel[] | null; error: Error | null } {
  const [data, setData] = useState<Channel[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    fetchJson<{ channels: Channel[] }>('/data/channels.json')
      .then((d) => {
        if (alive) setData(d.channels)
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      alive = false
    }
  }, [])

  return { data, error }
}
