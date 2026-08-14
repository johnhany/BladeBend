import { formatPower, NO_DATA_COLOR } from '@/utils/colorScales'

interface LegendProps {
  /** 色阶：值 -> 颜色。 */
  scale: (value: number) => string
  domain: [number, number]
  label?: string
}

/** 几何（对数）插值，使色带与对数比例尺视觉对齐。 */
function geoInterp(min: number, max: number, t: number): number {
  return min * (max / min) ** t
}

/** 动态图例：色带 + 断点标签，反映当前指标的数据范围。 */
export function Legend({ scale, domain, label = '总装机' }: LegendProps) {
  const [min, max] = domain
  const gradStops = Array.from({ length: 20 }, (_, i) => {
    const t = i / 19
    return `${scale(geoInterp(min, max, t))} ${(t * 100).toFixed(1)}%`
  }).join(', ')
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => geoInterp(min, max, t))

  return (
    <div className="absolute bottom-5 left-5 z-10 w-60 rounded-md border border-map-border bg-map-panel/85 px-3 py-2 backdrop-blur">
      <div className="mb-1 text-xs font-medium text-slate-300">{label}</div>
      <div
        className="h-3 w-full rounded border border-black/30"
        style={{ background: `linear-gradient(to right, ${gradStops})` }}
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        {ticks.map((v, i) => (
          <span key={i}>{formatPower(v)}</span>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ background: NO_DATA_COLOR }}
        />
        无数据
      </div>
    </div>
  )
}
