import { useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { select, zoom, zoomIdentity, type ZoomBehavior } from 'd3'
import { useChinaGeo } from '@/hooks/useChinaGeo'
import { useMapStore } from '@/stores/mapStore'
import { adcodeOf, type ProvinceFeature } from '@/types/geo'
import { createChinaProjection, createGeoPath } from '@/utils/projection'
import { DetailPanel } from './DetailPanel'
import { ProvinceLayer } from './ProvinceLayer'
import { SouthChinaSeaInset } from './SouthChinaSeaInset'
import { Tooltip } from './Tooltip'

/** 设计坐标系（SVG viewBox）。响应式由 viewBox + preserveAspectRatio 自动缩放实现。 */
const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 760

/** 稳定的空数组引用，保证数据未加载时 provinces 引用不变（避免下游 useMemo 反复重算）。 */
const NO_PROVINCES: ProvinceFeature[] = []

export function MapContainer() {
  const { data, error, loading } = useChinaGeo()
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomGRef = useRef<SVGGElement>(null)
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const setMousePos = useMapStore((s) => s.setMousePos)
  const clearSelected = useMapStore((s) => s.clearSelected)

  const provinces = data?.provinces ?? NO_PROVINCES
  const southChinaSea = data?.southChinaSea ?? null

  // 投影随数据加载一次；fitExtent 自适应填充视口。
  const projection = useMemo(
    () =>
      provinces.length
        ? createChinaProjection(VIEW_WIDTH, VIEW_HEIGHT, {
            type: 'FeatureCollection',
            features: provinces,
          })
        : null,
    [provinces],
  )
  const pathGen = useMemo(() => (projection ? createGeoPath(projection) : null), [projection])

  // 预计算各省 path d，避免每次悬停都重算投影路径。
  const pathDByAdcode = useMemo(() => {
    const map: Record<string, string> = {}
    if (pathGen) provinces.forEach((f: ProvinceFeature) => (map[adcodeOf(f)] = pathGen(f) ?? ''))
    return map
  }, [provinces, pathGen])

  // d3-zoom：变换以命令式方式写入 <g transform>，避免 React 每帧重渲染全部省份路径。
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        zoomGRef.current?.setAttribute('transform', event.transform.toString())
      })
    zoomBehaviorRef.current = z
    const selection = select(svg).call(z).on('dblclick.zoom', null)
    return () => {
      selection.on('.zoom', null)
    }
  }, [])

  const handleResetView = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current).call(zoomBehaviorRef.current.transform, zoomIdentity)
    }
  }

  const handleMouseMove = (e: ReactMouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-400">
        地图数据加载失败：{error.message}
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-map-bg">
      {/* 标题 */}
      <div className="pointer-events-none absolute left-5 top-4 z-10">
        <h1 className="text-lg font-semibold text-white">全国电力数据可视化地图</h1>
        <p className="text-xs text-slate-400">
          Phase 1 · 基础地图{provinces.length ? `（${provinces.length} 个省级行政区）` : ''}
        </p>
      </div>

      {/* 视图控制 */}
      <button
        type="button"
        onClick={handleResetView}
        className="absolute right-5 top-4 z-10 rounded-md border border-map-border bg-map-panel/80 px-3 py-1.5 text-xs text-slate-200 backdrop-blur transition-colors hover:border-map-accent"
      >
        重置视图
      </button>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        style={{ cursor: 'grab', touchAction: 'none' }}
        onMouseMove={handleMouseMove}
      >
        <defs>
          <filter id="province-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 背景矩形：点击空白处取消选中 */}
        <rect
          x={0}
          y={0}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          fill="#0a1628"
          onClick={clearSelected}
        />

        {/* 可缩放、平移的省份图层 */}
        <g ref={zoomGRef}>
          <ProvinceLayer features={provinces} pathDByAdcode={pathDByAdcode} />
        </g>

        {/* 固定的南海诸岛插图（不随缩放移动） */}
        {southChinaSea && (
          <SouthChinaSeaInset feature={southChinaSea} width={VIEW_WIDTH} height={VIEW_HEIGHT} />
        )}
      </svg>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-slate-400">
          正在加载地图数据…
        </div>
      )}

      <Tooltip />
      <DetailPanel />
    </div>
  )
}
