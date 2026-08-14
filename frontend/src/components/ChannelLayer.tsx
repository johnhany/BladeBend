import { useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { interpolateRgb } from 'd3'
import type { GeoProjection } from 'd3-geo'
import type { Channel, TradeItem } from '@/types/data'
import { useMapStore } from '@/stores/mapStore'

interface ChannelLayerProps {
  channels: Channel[]
  projection: GeoProjection
  /** channel_id -> 当月交易（用于粒子颜色映射均价）。 */
  tradeByChannel?: Map<string, TradeItem>
  highlightedId?: string | null
}

interface ChannelItem {
  ch: Channel
  d: string
  p1: [number, number]
  width: number
  stroke: string
  dash?: string
  count: number
  particleColor: string
}

/**
 * 跨省输电通道层（SDD §3.3）：
 * - 二次贝塞尔曲线路径，控制点为连线中点上偏（弧线避免遮挡）
 * - 线宽映射 capacity_mw，DC 实线（琥珀）/ AC 虚线（蓝）
 * - 粒子流：方向 送端→受端，密度随容量；颜色映射当月送电均价
 */
export function ChannelLayer({
  channels,
  projection,
  tradeByChannel,
  highlightedId,
}: ChannelLayerProps) {
  const setHoveredChannel = useMapStore((s) => s.setHoveredChannel)
  const setMousePos = useMapStore((s) => s.setMousePos)

  const items = useMemo<ChannelItem[]>(() => {
    if (!channels.length) return []
    const maxCap = Math.max(...channels.map((c) => c.capacity_mw))
    const prices = tradeByChannel
      ? Array.from(tradeByChannel.values()).map((t) => t.avg_price_yuan_mwh)
      : []
    const pMin = prices.length ? Math.min(...prices) : 0
    const pMax = prices.length ? Math.max(...prices) : 1
    const priceColor = interpolateRgb('#38bdf8', '#f87171')

    return channels
      .map((ch, idx): ChannelItem | null => {
        const s = projection([ch.start_point.lng, ch.start_point.lat])
        const e = projection([ch.end_point.lng, ch.end_point.lat])
        if (!s || !e || !Number.isFinite(s[0]) || !Number.isFinite(e[0])) return null
        // 弯曲系数按序微调，避免同起止点通道完全重叠
        const bow = 0.2 + (idx % 3) * 0.05
        const cx = (s[0] + e[0]) / 2
        const cy = (s[1] + e[1]) / 2 - Math.abs(e[0] - s[0]) * bow
        const ratio = ch.capacity_mw / maxCap
        const trade = tradeByChannel?.get(ch.id)
        return {
          ch,
          d: `M${s[0].toFixed(1)},${s[1].toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${e[0].toFixed(1)},${e[1].toFixed(1)}`,
          p1: [s[0], s[1]],
          width: 1 + 3 * ratio,
          stroke: ch.type === 'DC' ? '#f59e0b' : '#60a5fa',
          dash: ch.type === 'AC' ? '6 3' : undefined,
          count: 2 + Math.round(4 * ratio),
          particleColor: trade
            ? priceColor((trade.avg_price_yuan_mwh - pMin) / Math.max(pMax - pMin, 1))
            : '#fbbf24',
        }
      })
      .filter((x): x is ChannelItem => !!x)
  }, [channels, projection, tradeByChannel])

  // 粒子动画：单一 requestAnimationFrame 循环驱动全部粒子
  const pathEls = useRef(new Map<string, SVGPathElement>())
  const particleEls = useRef(new Map<string, SVGCircleElement[]>())

  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = (now - t0) / 1000
      for (const [id, path] of pathEls.current) {
        let len = 0
        try {
          len = path.getTotalLength()
        } catch {
          continue
        }
        if (!len) continue
        const circles = (particleEls.current.get(id) ?? []).filter(Boolean)
        circles.forEach((c, i) => {
          const p = (t * 0.1 + i / circles.length) % 1
          const pt = path.getPointAtLength(p * len)
          c.setAttribute('cx', String(pt.x))
          c.setAttribute('cy', String(pt.y))
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [items])

  const updateMouse = (e: ReactMouseEvent<SVGPathElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement | null)?.getBoundingClientRect()
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <g>
      {items.map((it) => {
        const hl = it.ch.id === highlightedId
        return (
          <g key={it.ch.id}>
            {/* 透明加宽命中区，便于悬停 */}
            <path
              d={it.d}
              fill="none"
              stroke="transparent"
              strokeWidth={9}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredChannel(it.ch)}
              onMouseMove={updateMouse}
              onMouseLeave={() => setHoveredChannel(null)}
            />
            {/* 通道主线（同时作为粒子动画的路径测量元素） */}
            <path
              ref={(el) => {
                if (el) pathEls.current.set(it.ch.id, el)
                else pathEls.current.delete(it.ch.id)
              }}
              d={it.d}
              fill="none"
              stroke={it.stroke}
              strokeWidth={it.width}
              strokeDasharray={it.dash}
              strokeLinecap="round"
              opacity={hl ? 1 : 0.8}
              pointerEvents="none"
            />
            {hl && (
              <path
                d={it.d}
                fill="none"
                stroke="#ffffff"
                strokeWidth={it.width + 1.5}
                strokeLinecap="round"
                opacity={0.6}
                pointerEvents="none"
              />
            )}
            {/* 送端换流站点位 */}
            <circle cx={it.p1[0]} cy={it.p1[1]} r={1.6} fill={it.stroke} pointerEvents="none" />
            {/* 流动粒子（送端 -> 受端） */}
            {Array.from({ length: it.count }).map((_, i) => (
              <circle
                key={i}
                r={1.7}
                fill={it.particleColor}
                cx={it.p1[0]}
                cy={it.p1[1]}
                opacity={0.95}
                pointerEvents="none"
                ref={(el) => {
                  const arr = particleEls.current.get(it.ch.id) ?? []
                  if (el) arr[i] = el
                  else delete arr[i]
                  particleEls.current.set(it.ch.id, arr)
                }}
              />
            ))}
          </g>
        )
      })}
    </g>
  )
}
