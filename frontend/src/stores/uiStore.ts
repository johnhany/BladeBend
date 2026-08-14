import { create } from 'zustand'

export type FocusKind = 'province' | 'city' | 'channel'
export interface FocusRequest {
  kind: FocusKind
  id: string
  /** 递增序号，重复定位同一目标时重新触发 effect。 */
  seq: number
}

interface UIState {
  /** 图层显隐。 */
  showCities: boolean
  showChannels: boolean
  showRivers: boolean
  toggleCities: () => void
  toggleChannels: () => void
  toggleRivers: () => void
  setChannelsVisible: (v: boolean) => void

  /** 搜索定位后的高亮目标。 */
  highlightChannel: string | null
  highlightCity: string | null
  setHighlightChannel: (id: string | null) => void
  setHighlightCity: (name: string | null) => void

  /** 定位请求（触发地图缩放平移）。 */
  focus: FocusRequest | null
  requestFocus: (kind: FocusKind, id: string) => void
}

let focusSeq = 0

export const useUIStore = create<UIState>((set) => ({
  showCities: true,
  showChannels: true,
  showRivers: false,
  toggleCities: () => set((s) => ({ showCities: !s.showCities })),
  toggleChannels: () => set((s) => ({ showChannels: !s.showChannels })),
  toggleRivers: () => set((s) => ({ showRivers: !s.showRivers })),
  setChannelsVisible: (v) => set({ showChannels: v }),

  highlightChannel: null,
  highlightCity: null,
  setHighlightChannel: (id) => set({ highlightChannel: id }),
  setHighlightCity: (name) => set({ highlightCity: name }),

  focus: null,
  requestFocus: (kind, id) => set({ focus: { kind, id, seq: ++focusSeq } }),
}))
