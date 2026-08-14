import { useEffect, useState } from 'react'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import {
  type ProvinceFeature,
  type ProvinceFeatureCollection,
  SOUTH_CHINA_SEA_ADCODE,
  adcodeOf,
} from '@/types/geo'
import { rewindFeatureCollection } from '@/utils/geo'
import chinaTopoUrl from '../assets/geo/china.topojson?url'

export interface ChinaGeoData {
  /** 34 个省级行政区（不含南海诸岛插图要素）。 */
  provinces: ProvinceFeature[]
  /** 南海诸岛 / 九段线要素，用于右下角插图。 */
  southChinaSea: ProvinceFeature | null
}

/** 加载本地 china.topojson，经 topojson.feature 解码为 GeoJSON 并拆分主体与插图要素。 */
export function useChinaGeo(): {
  data: ChinaGeoData | null
  error: Error | null
  loading: boolean
} {
  const [data, setData] = useState<ChinaGeoData | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    fetch(chinaTopoUrl)
      .then((res) => res.json() as Promise<Topology>)
      .then((topo) => {
        const gc = topo.objects.provinces as GeometryCollection
        const fc = feature(topo, gc) as unknown as ProvinceFeatureCollection
        // 规范化环方向：DataV 外环为 CCW，会导致 d3-geo 把陆地当洞、绘制出覆盖全图的裁剪圆弧
        rewindFeatureCollection(fc)
        const all = fc.features
        const provinces = all.filter((f) => adcodeOf(f) !== SOUTH_CHINA_SEA_ADCODE)
        const southChinaSea = all.find((f) => adcodeOf(f) === SOUTH_CHINA_SEA_ADCODE) ?? null
        if (alive) setData({ provinces, southChinaSea })
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      alive = false
    }
  }, [])

  return { data, error, loading: !data && !error }
}
