import { useDataStore } from '@/stores/dataStore'
import type { Indicator } from '@/types/data'

const TABS: { key: Indicator; label: string }[] = [
  { key: 'capacity', label: '装机量' },
  { key: 'spot', label: '现货电价' },
  { key: 'medium_long', label: '中长期电价' },
]

/** 顶部指标切换器（装机 / 现货 / 中长期，PRD §3.3.1）。 */
export function ControlBar() {
  const indicator = useDataStore((s) => s.indicator)
  const setIndicator = useDataStore((s) => s.setIndicator)

  return (
    <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 rounded-md border border-map-border bg-map-panel/80 p-0.5 backdrop-blur">
      {TABS.map((t) => {
        const active = indicator === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setIndicator(t.key)}
            className={`rounded px-3 py-1 text-xs transition-colors ${
              active
                ? 'bg-map-accent/25 font-medium text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
