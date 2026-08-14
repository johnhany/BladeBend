import { useMemo, useState } from 'react'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import { adcodeOf, type ProvinceFeature } from '@/types/geo'
import type { Channel } from '@/types/data'
import { CITIES } from './CityLayer'

interface SearchBoxProps {
  provinces: ProvinceFeature[]
  channels: Channel[]
}

type Result = { kind: 'province' | 'city' | 'channel'; label: string; sub: string; id: string }

/** 搜索定位：省份 / 城市 / 输电通道，选中后高亮并缩放定位（PRD §3.3.3）。 */
export function SearchBox({ provinces, channels }: SearchBoxProps) {
  const [q, setQ] = useState('')
  const setSelected = useMapStore((s) => s.setSelected)
  const clearMulti = useMapStore((s) => s.clearMulti)
  const setHighlightChannel = useUIStore((s) => s.setHighlightChannel)
  const setHighlightCity = useUIStore((s) => s.setHighlightCity)
  const requestFocus = useUIStore((s) => s.requestFocus)

  const results = useMemo<Result[]>(() => {
    const kw = q.trim().toLowerCase()
    if (!kw) return []
    const out: Result[] = []
    for (const f of provinces) {
      const name = (f.properties?.name as string) ?? ''
      if (name.toLowerCase().includes(kw))
        out.push({ kind: 'province', label: name, sub: '省份', id: adcodeOf(f) })
    }
    for (const c of channels) {
      if (c.name.toLowerCase().includes(kw))
        out.push({
          kind: 'channel',
          label: c.name,
          sub: `通道 · ${c.type === 'DC' ? '直流' : '交流'} ${c.voltage_kv}kV`,
          id: c.id,
        })
    }
    for (const c of CITIES) {
      if (c.name.toLowerCase().includes(kw) || c.province.toLowerCase().includes(kw))
        out.push({ kind: 'city', label: c.name, sub: `城市 · ${c.province}`, id: c.name })
    }
    return out.slice(0, 9)
  }, [q, provinces, channels])

  const pick = (r: Result) => {
    if (r.kind === 'province') {
      const f = provinces.find((p) => adcodeOf(p) === r.id)
      if (f) {
        setSelected(f)
        clearMulti()
      }
      setHighlightCity(null)
      setHighlightChannel(null)
    } else if (r.kind === 'channel') {
      setHighlightChannel(r.id)
      setHighlightCity(null)
    } else {
      setHighlightCity(r.id)
      setHighlightChannel(null)
    }
    requestFocus(r.kind, r.id)
    setQ('')
  }

  return (
    <div className="absolute left-1/2 top-12 z-20 w-64 -translate-x-1/2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索省份 / 城市 / 通道…"
        className="w-full rounded-md border border-map-border bg-map-panel/85 px-3 py-1.5 text-xs text-slate-200 shadow-lg outline-none backdrop-blur placeholder:text-slate-500 focus:border-map-accent"
      />
      {results.length > 0 && (
        <ul className="mt-1 max-h-60 overflow-y-auto rounded-md border border-map-border bg-map-panel/95 shadow-xl backdrop-blur">
          {results.map((r) => (
            <li key={r.kind + r.id}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs text-slate-200 transition-colors hover:bg-map-border/50"
              >
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 text-[10px] text-slate-500">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
