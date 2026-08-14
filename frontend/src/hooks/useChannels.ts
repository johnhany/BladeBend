import { useEffect, useState } from 'react'
import type { Channel, ChannelsResponse } from '@/types/data'

/** 加载输电通道静态数据（/api/channels）。 */
export function useChannels(): { data: Channel[] | null; error: Error | null } {
  const [data, setData] = useState<Channel[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/channels')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<ChannelsResponse>
      })
      .then((res) => {
        if (alive) setData(res.data)
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
