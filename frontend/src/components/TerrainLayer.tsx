import { useEffect, useMemo, useState } from 'react'
import { curveCatmullRom, line } from 'd3'
import type { GeoProjection } from 'd3-geo'
import { fetchJson } from '@/utils/staticData'
import { useMapStore } from '@/stores/mapStore'

interface RiverSeg {
  name: string
  name_en: string
  cn_named: boolean
  rank: number
  points: [number, number][]
}

/** 线宽按河流等级：1-3 干流 1.2px / 4-5 大支流 0.8px / 6-7 次级 0.45px */
function widthOf(rank: number): number {
  if (rank <= 3) return 1.2
  if (rank <= 5) return 0.8
  return 0.45
}

/** 标注基准字号：干流 8 / 支流 7 / 次级 6.5 */
function fontSizeOf(rank: number): number {
  if (rank <= 3) return 8
  if (rank <= 5) return 7
  return 6.5
}

/**
 * 河流层（Natural Earth 1:10m 中心线，scripts/build_rivers.py 生成）：
 * Catmull-Rom 平滑曲线、线宽按等级、每条河名只标注一次（取最长段），
 * 标注字号随缩放次线性增大（k^0.45），避免放大后文字过大。
 */
export function TerrainLayer({ projection }: { projection: GeoProjection }) {
  const [rivers, setRivers] = useState<RiverSeg[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const zoomScale = useMapStore((s) => s.zoomScale)

  useEffect(() => {
    let alive = true
    fetchJson<{ rivers: RiverSeg[] }>('/data/rivers.json')
      .then((d) => {
        if (alive) setRivers(d.rivers)
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      alive = false
    }
  }, [])

  const items = useMemo(() => {
    if (!rivers) return []
    const gen = line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveCatmullRom.alpha(0.5))
    const out: {
      seg: RiverSeg
      d: string
      labelAt: [number, number] | null
      pts: [number, number][]
    }[] = []
    for (const seg of rivers) {
      const pts = seg.points
        .map((pt) => projection(pt))
        .filter((p): p is [number, number] => !!p && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      if (pts.length < 2) continue
      const d = gen(pts) ?? ''
      if (!d) continue
      out.push({ seg, d, labelAt: null, pts })
    }
    // 每条河名只标注一次（跨界河如黑龙江被裁成多段，取最长的一段标注）
    const bestByName = new Map<string, number>()
    out.forEach((it, i) => {
      if (!it.seg.name || it.pts.length <= 8) return
      const cur = bestByName.get(it.seg.name)
      if (cur === undefined || it.pts.length > out[cur].pts.length) bestByName.set(it.seg.name, i)
    })
    for (const i of bestByName.values()) {
      const it = out[i]
      it.labelAt = it.pts[Math.floor(it.pts.length / 2)]
    }
    return out.map(({ seg, d, labelAt }) => ({ seg, d, labelAt }))
  }, [rivers, projection])

  if (error) return null

  // 缩放补偿：元素已在缩放 <g> 内被放大 k 倍，需除以 k^0.55 抵消，
  // 最终屏幕上的视觉尺寸 = k × k^-0.55 = k^0.45（次线性增大，k=8 时约 2.55 倍而非 8 倍）
  const s = Math.pow(zoomScale, -0.55)

  return (
    <g>
      {items.map(({ seg, d, labelAt }, i) => (
        <g key={i}>
          <path
            d={d}
            fill="none"
            stroke={seg.rank <= 3 ? '#3b5f82' : '#2e4d6b'}
            strokeWidth={widthOf(seg.rank)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={seg.rank <= 5 ? 0.6 : 0.4}
            pointerEvents="none"
          >
            <title>{seg.name || seg.name_en || '河流'}</title>
          </path>
          {labelAt && (
            <text
              transform={`translate(${labelAt[0]},${labelAt[1]}) scale(${s})`}
              y={-3}
              textAnchor="middle"
              style={{ fontSize: fontSizeOf(seg.rank), paintOrder: 'stroke' }}
              stroke="#0a1628"
              strokeWidth={2}
              fill="#51708f"
              pointerEvents="none"
            >
              {seg.name}
            </text>
          )}
        </g>
      ))}
    </g>
  )
}
