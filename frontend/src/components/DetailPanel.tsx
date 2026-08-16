import { useMapStore } from '@/stores/mapStore'
import { usePriceHistory } from '@/hooks/usePriceHistory'
import { useEnergyData } from '@/hooks/useEnergyData'
import { formatEnergyGwh, formatPower, formatPrice } from '@/utils/colorScales'
import { isMockSource } from '@/utils/dataSource'
import { adcodeOf } from '@/types/geo'
import type { AnnualPrice, CapacityItem } from '@/types/data'
import { ChartPanel } from './ChartPanel'
import { ComparisonView } from './ComparisonView'
import { EnergyCharts } from './EnergyCharts'
import { PriceLineChart } from './PriceLineChart'

interface DetailPanelProps {
  capacityByAdcode?: Map<string, CapacityItem>
  /** 年度电价聚合（全年已披露月份算术平均）。 */
  annualPriceByAdcode?: Map<string, AnnualPrice>
}

/**
 * 省份详情面板：单省模式（装机 + 年度电价 + 12 个月走势折线图）；
 * Ctrl+点击多选 ≥2 省时切换为并列对比视图（PRD §3.1.2）。
 */
export function DetailPanel({ capacityByAdcode, annualPriceByAdcode }: DetailPanelProps) {
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
  const { data: energy } = useEnergyData(open && !compareMode ? code : null)

  const capacity = code ? capacityByAdcode?.get(code) : undefined
  const annualPrice = code ? annualPriceByAdcode?.get(code) : undefined

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
            annualPriceByAdcode={annualPriceByAdcode}
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
                {isMockSource(capacity.source_url) ? (
                  <span className="inline-block rounded border border-slate-600/60 bg-slate-700/30 px-1.5 py-0.5 text-[9px] text-slate-400">
                    模拟数据（开发用，待真实数据替换）
                  </span>
                ) : (
                  capacity.source_url && (
                    <a
                      href={capacity.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[9px] text-slate-600 transition-colors hover:text-map-accent"
                      title={capacity.source_url}
                    >
                      数据来源：{capacity.source_url}
                    </a>
                  )
                )}
                <ChartPanel item={capacity} />
              </>
            )}

            {(energy?.annual || (energy?.months.length ?? 0) > 0) && (
              <section>
                <h3 className="mb-1.5 font-medium text-slate-300">
                  电量 · {energy?.annual?.year ?? '—'} 年度
                </h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  {(
                    [
                      ['发电量', energy?.annual?.generation_gwh],
                      ['用电量', energy?.annual?.consumption_gwh],
                      ['跨省受入', energy?.annual?.received_gwh],
                      ['跨省送出', energy?.annual?.sent_gwh],
                    ] as const
                  ).map(([label, v]) => (
                    <span key={label} className="flex justify-between">
                      <span className="text-slate-500">{label}</span>
                      <span className="text-slate-200">{v != null ? formatEnergyGwh(v) : '—'}</span>
                    </span>
                  ))}
                </div>
                {energy?.annual?.source_url && (
                  <a
                    href={energy.annual.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-[9px] text-slate-600 transition-colors hover:text-map-accent"
                    title={energy.annual.source_url}
                  >
                    数据来源：{energy.annual.source_url}
                  </a>
                )}
                <EnergyCharts annual={energy?.annual ?? null} months={energy?.months ?? []} />

                {(energy?.annual?.subregions?.length ?? 0) > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <h4 className="text-[10px] text-slate-500">电网分区（一区两网）</h4>
                    {energy?.annual?.subregions?.map((sr) => (
                      <div
                        key={sr.name}
                        className="rounded border border-map-border/60 px-2 py-1.5"
                      >
                        <div className="text-xs font-medium text-slate-200">{sr.name}</div>
                        <div className="mt-0.5 flex gap-3 text-[10px] text-slate-500">
                          <span>
                            装机{' '}
                            <span className="text-slate-300">
                              {sr.capacity_mw != null ? formatPower(sr.capacity_mw) : '—'}
                            </span>
                          </span>
                          <span>
                            年发电{' '}
                            <span className="text-slate-300">
                              {sr.generation_gwh != null ? formatEnergyGwh(sr.generation_gwh) : '—'}
                            </span>
                          </span>
                        </div>
                        {sr.prices && sr.prices.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {sr.prices.map((p) => (
                              <div key={p.label} className="flex justify-between text-[10px]">
                                <span className="text-slate-500">{p.label}</span>
                                <span className="text-slate-300">
                                  {formatPrice(p.value)}
                                  {p.volume_gwh != null && (
                                    <span className="ml-1 text-slate-600">
                                      {formatEnergyGwh(p.volume_gwh)}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {annualPrice && (
              <section>
                <h3 className="mb-1.5 font-medium text-slate-300">年度电价</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <span className="flex justify-between">
                    <span className="text-slate-500">现货均价</span>
                    <span className="text-slate-200">
                      {annualPrice.spot_avg != null ? formatPrice(annualPrice.spot_avg) : '—'}
                      {annualPrice.spot_months > 0 && annualPrice.spot_months < 12 && (
                        <span className="ml-1 text-[9px] text-slate-600">
                          {annualPrice.spot_months}月均
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex justify-between">
                    <span className="text-slate-500">中长期均价</span>
                    <span className="text-slate-200">
                      {annualPrice.mlt_avg != null ? formatPrice(annualPrice.mlt_avg) : '—'}
                      {annualPrice.mlt_months > 0 && annualPrice.mlt_months < 12 && (
                        <span className="ml-1 text-[9px] text-slate-600">
                          {annualPrice.mlt_months}月均
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              </section>
            )}

            {(energy?.annual?.benchmark_price_yuan_mwh != null ||
              (energy?.annual?.extra_stats?.length ?? 0) > 0) && (
              <section>
                <h3 className="mb-1.5 font-medium text-slate-300">
                  年度指标 · {energy?.annual?.year ?? '—'}
                </h3>
                <div className="space-y-0.5 text-[11px]">
                  {energy?.annual?.benchmark_price_yuan_mwh != null && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">燃煤基准价</span>
                      <span className="text-slate-200">
                        {formatPrice(energy.annual.benchmark_price_yuan_mwh)}
                      </span>
                    </div>
                  )}
                  {energy?.annual?.extra_stats?.map((s) => (
                    <div key={s.label} className="flex justify-between gap-3">
                      <span className="text-slate-500">{s.label}</span>
                      <span className="shrink-0 text-slate-200">{s.value}</span>
                    </div>
                  ))}
                </div>
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

            {!capacity && !annualPrice && !energy?.annual && (
              <p className="leading-relaxed text-slate-500">该省份暂无数据。</p>
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
