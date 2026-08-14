import { useUIStore } from '@/stores/uiStore'

/** 图层开关：城市点位 / 输电通道 / 河流（PRD §3.3.1）。 */
export function LayerToggles() {
  const showCities = useUIStore((s) => s.showCities)
  const showChannels = useUIStore((s) => s.showChannels)
  const showRivers = useUIStore((s) => s.showRivers)
  const toggleCities = useUIStore((s) => s.toggleCities)
  const toggleChannels = useUIStore((s) => s.toggleChannels)
  const toggleRivers = useUIStore((s) => s.toggleRivers)

  const toggles = [
    { label: '城市点位', on: showCities, action: toggleCities },
    { label: '输电通道', on: showChannels, action: toggleChannels },
    { label: '河流', on: showRivers, action: toggleRivers },
  ]

  return (
    <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-md border border-map-border bg-map-panel/80 p-0.5 backdrop-blur">
      {toggles.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={t.action}
          className={`rounded px-2.5 py-1 text-[11px] transition-colors ${
            t.on ? 'bg-map-accent/25 text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {t.on ? '◉' : '○'} {t.label}
        </button>
      ))}
    </div>
  )
}
