import { useMapStore } from '@/stores/mapStore'

/**
 * 省份详情面板：点击省份后从右侧滑入。Phase 1 为空壳，图表占位待 Phase 2-3。
 */
export function DetailPanel() {
  const selected = useMapStore((s) => s.selected)
  const clearSelected = useMapStore((s) => s.clearSelected)

  const open = !!selected
  const name = selected?.properties?.name
  const adcode = selected ? String(selected.properties?.adcode ?? '') : ''

  return (
    <aside
      className={`fixed right-0 top-0 z-30 h-full w-80 border-l border-map-border bg-map-panel/95 backdrop-blur transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between border-b border-map-border px-4 py-3">
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
        <p className="leading-relaxed">
          省份详情面板（Phase 1 空壳）。装机结构、电价走势等图表将在后续阶段接入。
        </p>

        <section>
          <h3 className="mb-2 font-medium text-slate-300">装机结构</h3>
          <div className="flex h-32 items-center justify-center rounded border border-dashed border-map-border text-slate-600">
            堆叠柱状图 · Phase 2
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-medium text-slate-300">电价走势</h3>
          <div className="flex h-32 items-center justify-center rounded border border-dashed border-map-border text-slate-600">
            时序折线图 · Phase 3
          </div>
        </section>
      </div>
    </aside>
  )
}
