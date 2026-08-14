import { create } from 'zustand'
import type { ProvinceFeature } from '@/types/geo'

export interface MousePos {
  x: number
  y: number
}

interface MapState {
  /** 当前悬停的省份要素。 */
  hovered: ProvinceFeature | null
  /** 当前选中的省份要素（点击后展开详情面板）。 */
  selected: ProvinceFeature | null
  /** 鼠标在地图容器内的坐标，用于定位 Tooltip。 */
  mousePos: MousePos

  setHovered: (feature: ProvinceFeature | null) => void
  setSelected: (feature: ProvinceFeature | null) => void
  clearSelected: () => void
  setMousePos: (pos: MousePos) => void
}

export const useMapStore = create<MapState>((set) => ({
  hovered: null,
  selected: null,
  mousePos: { x: 0, y: 0 },

  setHovered: (feature) => set({ hovered: feature }),
  setSelected: (feature) => set({ selected: feature }),
  clearSelected: () => set({ selected: null }),
  setMousePos: (pos) => set({ mousePos: pos }),
}))
