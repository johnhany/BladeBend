import { useEffect, useState } from 'react'
import type { FlowsDoc, ProvinceFlow } from '@/types/data'
import { fetchJson } from '@/utils/staticData'

/** 跨区域受送电年度连线（静态 /data/flows.json，由 scripts/build_flows.py 生成）。 */
export function useFlows(): { flows: ProvinceFlow[]; error: Error | null } {
  const [flows, setFlows] = useState<ProvinceFlow[]>([])
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    fetchJson<FlowsDoc>('/data/flows.json')
      .then((d) => {
        if (alive) setFlows(d.flows)
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      alive = false
    }
  }, [])

  return { flows, error }
}
