import { AVAILABLE_MONTHS, AVAILABLE_YEARS, useDataStore } from '@/stores/dataStore'

const selectCls =
  'rounded border border-map-border bg-map-panel/80 px-2 py-1 text-xs text-slate-200 backdrop-blur outline-none'

/** 时间选择器：装机按年份（年度汇总）；电价按年份+月份（PRD §3.3.1）。 */
export function TimeSelector() {
  const indicator = useDataStore((s) => s.indicator)
  const year = useDataStore((s) => s.year)
  const month = useDataStore((s) => s.month)
  const setYear = useDataStore((s) => s.setYear)
  const setMonth = useDataStore((s) => s.setMonth)

  const isPrice = indicator !== 'capacity'

  return (
    <div className="flex items-center gap-2">
      {isPrice ? (
        <label className={selectCls}>
          月份
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="ml-1 bg-transparent outline-none"
          >
            {AVAILABLE_MONTHS.map((m) => (
              <option key={m} value={m} className="bg-map-panel text-slate-200">
                {m} 月
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="rounded-md border border-map-border bg-map-panel/80 px-2 py-1 text-xs text-slate-400 backdrop-blur">
          年度汇总
        </span>
      )}
      <label className={selectCls}>
        年份
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="ml-1 bg-transparent outline-none"
        >
          {AVAILABLE_YEARS.map((y) => (
            <option key={y} value={y} className="bg-map-panel text-slate-200">
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
