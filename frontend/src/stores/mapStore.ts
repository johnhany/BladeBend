import { create } from 'zustand'
import { adcodeOf, type ProvinceFeature } from '@/types/geo'
import type { Channel } from '@/types/data'

export interface MousePos {
  x: number
  y: number
}

interface MapState {
  /** 当前悬停的省份要素。 */
  hovered: ProvinceFeature | null
  /** 当前悬停的输电通道。 */
  hoveredChannel: Channel | null
  /** 当前选中的省份要素（单击，展示单省详情）。 */
  selected: ProvinceFeature | null
  /** Ctrl/Cmd+点击多选的省份要素（≥2 时进入对比模式）。 */
  multiSelected: ProvinceFeature[]
  /** 鼠标在地图容器内的坐标，用于定位 Tooltip。 */
  mousePos: MousePos

  setHovered: (feature: ProvinceFeature | null) => void
  setHoveredChannel: (channel: Channel | null) => void
  setSelected: (feature: ProvinceFeature | null) => void
  clearSelected: () => void
  toggleMulti: (feature: ProvinceFeature) => void
  clearMulti: () => void
  setMousePos: (pos: MousePos) => void
}

export const useMapStore = create<MapState>((set) => ({
  hovered: null,
  hoveredChannel: null,
  selected: null,
  multiSelected: [],
  mousePos: { x: 0, y: 0 },

  setHovered: (feature) => set({ hovered: feature }),
  setHoveredChannel: (channel) => set({ hoveredChannel: channel }),
  setSelected: (feature) => set({ selected: feature }),
  clearSelected: () => set({ selected: null }),
  toggleMulti: (feature) =>
    set((s) => {
      const code = adcodeOf(feature)
      const exists = s.multiSelected.some((f) => adcodeOf(f) === code)
      return {
        multiSelected: exists
          ? s.multiSelected.filter((f) => adcodeOf(f) !== code)
          : [...s.multiSelected, feature],
      }
    }),
  clearMulti: () => set({ multiSelected: [] }),
  setMousePos: (pos) => set({ mousePos: pos }),
}))
