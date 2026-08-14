import { useMapStore } from '@/stores/mapStore'
import { usePriceHistory } from '@/hooks/usePriceHistory'
import { formatPower, formatPrice } from '@/utils/colorScales'
import { adcodeOf } from '@/types/geo'
import type { CapacityItem, PriceItem } from '@/types/data'
import { ChartPanel } from './ChartPanel'
import { ComparisonView } from './ComparisonView'
import { PriceLineChart } from './PriceLineChart'

interface DetailPanelProps {
  capacityByAdcode?: Map<string, CapacityItem>
  priceByAdcode?: Map<string, PriceItem>
}

/**
 * 省份详情面板：单省模式（装机 + 当月电价 + 12 个月走势折线图）；
 * Ctrl+点击多选 ≥2 省时切换为并列对比视图（PRD §3.1.2）。
 */
export function DetailPanel({ capacityByAdcode, priceByAdcode }: DetailPanelProps) {
  const selected = useMapStore((s) => s.selected)
  const multiSelected = useMapStore((s) => s.multiSelected)
  const clearSelected = useMapStore((s) => s.clearSelected)
  const clearMulti = useMapStore((s) => s.clearMulti)

  const compareMode = multiSelected.length >= 2
  const open = compareMode || !!selected
  const code = selected ? adcodeOf(selected) : null
  const {
    points,
    loading: histLoading,
    error: histError,
  } = usePriceHistory(open && !compareMode ? code : null)

  const capacity = code ? capacityByAdcode?.get(code) : undefined
  const price = code ? priceByAdcode?.get(code) : undefined

  const handleClose = () => {
    clearSelected()
    clearMulti()
  }

  return (
    <aside
      className={`fixed right-0 top-0 z-30 h-full w-80 overflow-y-auto border-l border-map-border bg-map-panel/95 backdrop-blur transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-map-border bg-map-panel/95 px-4 py-3 backdrop-blur">
        <div>
          <div className="text-base font-semibold text-white">
            {compareMode
              ? `多省对比（${multiSelected.length}）`
              : selected
                ? (selected.properties?.name as string)
                : '未选择省份'}
          </div>
          {!compareMode && selected && (
            <div className="text-[10px] text-slate-500">编码 {code}</div>
          )}
          {compareMode && <div className="text-[10px] text-slate-500">Ctrl+点击增删省份</div>}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-map-border hover:text-white"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 p-4 text-xs text-slate-400">
        {compareMode ? (
          <ComparisonView
            features={multiSelected}
            capacityByAdcode={capacityByAdcode}
            priceByAdcode={priceByAdcode}
          />
        ) : selected ? (
          <>
            {capacity && (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-white">
                    {formatPower(capacity.total_mw)}
                  </span>
                  <span className="text-slate-500">总装机 · {capacity.year} 年度汇总</span>
                </div>
                <ChartPanel item={capacity} />
              </>
            )}

            {price && (
              <section>
                <h3 className="mb-1.5 font-medium text-slate-300">
                  当月电价 · {price.year}-{String(price.month).padStart(2, '0')}
                </h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <span className="flex justify-between">
                    <span className="text-slate-500">现货</span>
                    <span className="text-slate-200">{formatPrice(price.spot_avg_yuan_mwh)}</span>
                  </span>
                  <span className="flex justify-between">
                    <span className="text-slate-500">中长期</span>
                    <span className="text-slate-200">
                      {formatPrice(price.medium_long_avg_yuan_mwh)}
                    </span>
                  </span>
                  <span className="flex justify-between">
                    <span className="text-slate-500">最高</span>
                    <span className="text-slate-200">{formatPrice(price.spot_high_yuan_mwh)}</span>
                  </span>
                  <span className="flex justify-between">
                    <span className="text-slate-500">最低</span>
                    <span className="text-slate-200">{formatPrice(price.spot_low_yuan_mwh)}</span>
                  </span>
                </div>
                {price.is_anomaly && (
                  <div className="mt-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-400">
                    ⚠ {price.anomaly_reason}
                  </div>
                )}
              </section>
            )}

            <section>
              <h3 className="mb-1.5 font-medium text-slate-300">电价走势 · 近 12 个月</h3>
              {histLoading && (
                <div className="h-40 text-center text-[11px] text-slate-500">加载中…</div>
              )}
              {histError && <div className="text-[11px] text-red-400">历史电价加载失败</div>}
              {points && points.length >= 6 && <PriceLineChart points={points} />}
              {points && points.length > 0 && points.length < 6 && (
                <div className="text-[11px] text-slate-500">历史数据不足 6 个月</div>
              )}
              {points && points.length === 0 && (
                <div className="text-[11px] text-slate-500">暂无历史电价数据</div>
              )}
            </section>

            {!capacity && !price && (
              <p className="leading-relaxed text-slate-500">该省份在此时间点暂无数据。</p>
            )}
          </>
        ) : (
          <p className="leading-relaxed text-slate-500">
            点击地图省份查看详情；Ctrl+点击多个省份进入对比模式。
          </p>
        )}
      </div>
    </aside>
  )
}
