import { NO_DATA_COLOR } from '@/utils/colorScales'

export interface LegendSegment {
  color: string
  label: string
}

interface LegendProps {
  label: string
  segments: LegendSegment[]
}

/** 动态图例：分段色带 + 各段标签（装机为连续色阶采样段，电价为阈值分段）。 */
export function Legend({ label, segments }: LegendProps) {
  return (
    <div className="absolute bottom-5 left-5 z-10 w-72 rounded-md border border-map-border bg-map-panel/85 px-3 py-2 backdrop-blur">
      <div className="mb-1 text-xs font-medium text-slate-300">{label}</div>
      <div className="flex h-3 w-full overflow-hidden rounded border border-black/30">
        {segments.map((s, i) => (
          <div key={i} className="flex-1" style={{ background: s.color }} title={s.label} />
        ))}
      </div>
      <div className="mt-1 flex text-[10px] text-slate-400">
        {segments.map((s, i) => (
          <span key={i} className="flex-1 overflow-hidden whitespace-nowrap text-center">
            {s.label}
          </span>
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
