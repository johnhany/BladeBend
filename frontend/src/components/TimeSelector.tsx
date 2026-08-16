import { AVAILABLE_YEARS, useDataStore } from '@/stores/dataStore'

/**
 * 时间选择器：仅年份。各指标均按年度口径展示
 * （装机=年度汇总；电价=全年均价；跨区域受送电=年度总量）。
 */
export function TimeSelector() {
  const year = useDataStore((s) => s.year)
  const setYear = useDataStore((s) => s.setYear)

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-md border border-map-border bg-map-panel/80 px-2 py-1 text-xs text-slate-400 backdrop-blur">
        年度
      </span>
      <label className="rounded-md border border-map-border bg-map-panel/80 px-2 py-1 text-xs text-slate-200 backdrop-blur outline-none">
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
