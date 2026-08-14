import { useCallback, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { select, zoom, zoomIdentity, type ZoomBehavior } from 'd3'
import { useChinaGeo } from '@/hooks/useChinaGeo'
import { useCapacityData } from '@/hooks/useCapacityData'
import { useMapStore } from '@/stores/mapStore'
import { AVAILABLE_YEARS, useDataStore } from '@/stores/dataStore'
import { adcodeOf, type ProvinceFeature } from '@/types/geo'
import { createChinaProjection, createGeoPath } from '@/utils/projection'
import { makeCapacityScale, NO_DATA_COLOR } from '@/utils/colorScales'
import { DetailPanel } from './DetailPanel'
import { Legend } from './Legend'
import { ProvinceLayer } from './ProvinceLayer'
import { SummaryCard } from './SummaryCard'
import { SouthChinaSeaInset } from './SouthChinaSeaInset'
import { Tooltip } from './Tooltip'

const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 760
const NO_PROVINCES: ProvinceFeature[] = []

export function MapContainer() {
  const { data: geo, error: geoError, loading: geoLoading } = useChinaGeo()
  const { data: capacity, loading: capLoading, error: capError } = useCapacityData()

  const year = useDataStore((s) => s.year)
  const setYear = useDataStore((s) => s.setYear)
  const selected = useMapStore((s) => s.selected)
  const setMousePos = useMapStore((s) => s.setMousePos)
  const clearSelected = useMapStore((s) => s.clearSelected)

  const svgRef = useRef<SVGSVGElement>(null)
  const zoomGRef = useRef<SVGGElement>(null)
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const provinces = geo?.provinces ?? NO_PROVINCES
  const southChinaSea = geo?.southChinaSea ?? null

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

  const pathDByAdcode = useMemo(() => {
    const map: Record<string, string> = {}
    if (pathGen) provinces.forEach((f: ProvinceFeature) => (map[adcodeOf(f)] = pathGen(f) ?? ''))
    return map
  }, [provinces, pathGen])

  // 装机量 -> 对数色阶
  const values = useMemo(
    () => (capacity ? Array.from(capacity.byAdcode.values()).map((i) => i.total_mw) : []),
    [capacity],
  )
  const domain = useMemo<[number, number]>(() => {
    if (!values.length) return [1, 1000]
    return [Math.min(...values), Math.max(...values)]
  }, [values])
  const scale = useMemo(() => makeCapacityScale(domain), [domain])

  const getFill = useCallback(
    (adcode: string) => {
      const it = capacity?.byAdcode.get(adcode)
      return it ? scale(it.total_mw) : NO_DATA_COLOR
    },
    [capacity, scale],
  )

  const selectedCapacity = selected ? capacity?.byAdcode.get(adcodeOf(selected)) : undefined

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

  if (geoError) {
    return (
      <div className="flex h-full items-center justify-center text-red-400">
        地图数据加载失败：{geoError.message}
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-map-bg">
      {/* 标题 */}
      <div className="pointer-events-none absolute left-5 top-4 z-10">
        <h1 className="text-lg font-semibold text-white">全国电力数据可视化地图</h1>
        <p className="text-xs text-slate-400">指标：总装机 · Phase 2</p>
      </div>

      {/* 右上控制：年份 + 重置 */}
      <div className="absolute right-5 top-4 z-10 flex items-center gap-2">
        <label className="flex items-center gap-1 rounded-md border border-map-border bg-map-panel/80 px-2 py-1 text-xs text-slate-300 backdrop-blur">
          年份
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-transparent text-slate-200 outline-none"
          >
            {AVAILABLE_YEARS.map((y) => (
              <option key={y} value={y} className="bg-map-panel text-slate-200">
                {y}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleResetView}
          className="rounded-md border border-map-border bg-map-panel/80 px-3 py-1.5 text-xs text-slate-200 backdrop-blur transition-colors hover:border-map-accent"
        >
          重置视图
        </button>
      </div>

      {capError && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-md border border-red-500/40 bg-red-950/70 px-3 py-1 text-xs text-red-300">
          装机数据加载失败：{capError.message}
        </div>
      )}

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

        <rect
          x={0}
          y={0}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          fill="#0a1628"
          onClick={clearSelected}
        />

        <g ref={zoomGRef}>
          <ProvinceLayer features={provinces} pathDByAdcode={pathDByAdcode} getFill={getFill} />
        </g>

        {southChinaSea && (
          <SouthChinaSeaInset feature={southChinaSea} width={VIEW_WIDTH} height={VIEW_HEIGHT} />
        )}
      </svg>

      {(geoLoading || capLoading) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-slate-400">
          正在加载数据…
        </div>
      )}

      {capacity && (
        <SummaryCard
          summary={capacity.summary}
          items={Array.from(capacity.byAdcode.values())}
          year={year}
        />
      )}
      {capacity && <Legend scale={scale} domain={domain} />}

      <Tooltip capacityByAdcode={capacity?.byAdcode} />
      <DetailPanel capacity={selectedCapacity} />
    </div>
  )
}
