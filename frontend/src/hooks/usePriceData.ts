import { useEffect, useMemo, useState } from 'react'
import type { AnnualPrice, PriceItem } from '@/types/data'
import { useDataStore } from '@/stores/dataStore'
import { fetchJson } from '@/utils/staticData'

export interface PriceData {
  /** adcode -> 年度均价聚合（全年已披露月份的算术平均）。 */
  byAdcode: Map<string, AnnualPrice>
  /** 该年度被标记异常（触限价）的月度记录，用于地图 ⚠ 标注。 */
  anomalyItems: PriceItem[]
}

/**
 * 年度电价（静态 /data/price.json）：按年份聚合全年已披露月份的算术平均。
 * 地图着色使用年度均价，不随月份选择。activeType 为 null 时不返回数据。
 */
export function usePriceData(activeType: 'spot' | 'medium_long' | null): {
  data: PriceData | null
  loading: boolean
  error: Error | null
} {
  const year = useDataStore((s) => s.year)
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

  const data = useMemo<PriceData | null>(() => {
    if (!items) return null
    if (!activeType) return { byAdcode: new Map(), anomalyItems: [] }
    const acc = new Map<string, { s: number; sn: number; m: number; mn: number }>()
    const official = new Map<string, { s?: [number, number]; m?: [number, number] }>()
    const anomalyItems: PriceItem[] = []
    for (const it of items) {
      if (it.year !== year) continue
      if (it.month === 0) {
        // 官方年度均价记录（无逐月数据时直接采用；(值, 样本月数)）
        const o = official.get(it.province_code) ?? {}
        const sn = (it as PriceItem & { spot_months?: number }).spot_months
        const mn = (it as PriceItem & { mlt_months?: number }).mlt_months
        if (it.spot_avg_yuan_mwh != null) o.s = [it.spot_avg_yuan_mwh, sn ?? 12]
        if (it.medium_long_avg_yuan_mwh != null) o.m = [it.medium_long_avg_yuan_mwh, mn ?? 12]
        official.set(it.province_code, o)
        continue
      }
      if (it.is_anomaly) anomalyItems.push(it)
      const a = acc.get(it.province_code) ?? { s: 0, sn: 0, m: 0, mn: 0 }
      if (it.spot_avg_yuan_mwh != null) {
        a.s += it.spot_avg_yuan_mwh
        a.sn += 1
      }
      if (it.medium_long_avg_yuan_mwh != null) {
        a.m += it.medium_long_avg_yuan_mwh
        a.mn += 1
      }
      acc.set(it.province_code, a)
    }
    const byAdcode = new Map<string, AnnualPrice>()
    for (const [code, a] of acc) {
      const off = official.get(code)
      byAdcode.set(code, {
        spot_avg: off?.s ? off.s[0] : a.sn ? round2(a.s / a.sn) : null,
        mlt_avg: off?.m ? off.m[0] : a.mn ? round2(a.m / a.mn) : null,
        spot_months: off?.s ? off.s[1] : a.sn,
        mlt_months: off?.m ? off.m[1] : a.mn,
      })
    }
    // 仅有官方年度记录、无逐月记录的省份
    for (const [code, off] of official) {
      if (!byAdcode.has(code)) {
        byAdcode.set(code, {
          spot_avg: off.s ? off.s[0] : null,
          mlt_avg: off.m ? off.m[0] : null,
          spot_months: off.s ? off.s[1] : 0,
          mlt_months: off.m ? off.m[1] : 0,
        })
      }
    }
    return { byAdcode, anomalyItems }
  }, [items, activeType, year])

  return { data: activeType ? data : null, loading: items === null && !error, error }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
