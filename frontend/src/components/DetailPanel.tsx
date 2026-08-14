import { useMapStore } from '@/stores/mapStore'
import { formatPower } from '@/utils/colorScales'
import type { CapacityItem } from '@/types/data'
import { ChartPanel } from './ChartPanel'

interface DetailPanelProps {
  /** 当前选中省份（与选中时间点一致）的装机数据。 */
  capacity?: CapacityItem
}

/** 省份详情面板：点击省份后从右侧滑入，展示装机结构与图表。 */
export function DetailPanel({ capacity }: DetailPanelProps) {
  const selected = useMapStore((s) => s.selected)
  const clearSelected = useMapStore((s) => s.clearSelected)

  const open = !!selected
  const name = selected?.properties?.name
  const adcode = selected ? String(selected.properties?.adcode ?? '') : ''

  return (
    <aside
      className={`fixed right-0 top-0 z-30 h-full w-80 overflow-y-auto border-l border-map-border bg-map-panel/95 backdrop-blur transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-map-border bg-map-panel/95 px-4 py-3 backdrop-blur">
        <div>
          <div className="text-base font-semibold text-white">{open ? name : '未选择省份'}</div>
          {open && <div className="text-[10px] text-slate-500">编码 {adcode}</div>}
        </div>
        <button
          type="button"
          onClick={clearSelected}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-map-border hover:text-white"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 p-4 text-xs text-slate-400">
        {open && capacity ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-white">
                {formatPower(capacity.total_mw)}
              </span>
              <span className="text-slate-500">
                总装机 · {capacity.year} 年{capacity.month ? `${capacity.month} 月` : '度汇总'}
              </span>
            </div>

            <ChartPanel item={capacity} />

            <section>
              <h3 className="mb-2 font-medium text-slate-300">电价走势</h3>
              <div className="flex h-28 items-center justify-center rounded border border-dashed border-map-border text-slate-600">
                时序折线图 · Phase 3
              </div>
            </section>
          </>
        ) : open ? (
          <p className="leading-relaxed text-slate-500">该省份在此时间点暂无装机数据。</p>
        ) : (
          <p className="leading-relaxed text-slate-500">点击地图上的省份查看装机结构详情。</p>
        )}
      </div>
    </aside>
  )
}
