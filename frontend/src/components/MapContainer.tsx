import { useCallback, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { select, zoom, zoomIdentity, type ZoomBehavior } from 'd3'
import { useChinaGeo } from '@/hooks/useChinaGeo'
import { useCapacityData } from '@/hooks/useCapacityData'
import { usePriceData } from '@/hooks/usePriceData'
import { useMapStore } from '@/stores/mapStore'
import { useDataStore } from '@/stores/dataStore'
import { adcodeOf, type ProvinceFeature } from '@/types/geo'
import { createChinaProjection, createGeoPath } from '@/utils/projection'
import {
  formatPower,
  makeCapacityScale,
  makePriceThresholdScale,
  NO_DATA_COLOR,
} from '@/utils/colorScales'
import type { Indicator } from '@/types/data'
import { AnomalyLayer, type AnomalyMark } from './AnomalyLayer'
import { ControlBar } from './ControlBar'
import { DetailPanel } from './DetailPanel'
import { Legend } from './Legend'
import { ProvinceLayer } from './ProvinceLayer'
import { SummaryCard } from './SummaryCard'
import { SouthChinaSeaInset } from './SouthChinaSeaInset'
import { TimeSelector } from './TimeSelector'
import { Tooltip } from './Tooltip'

const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 760
const NO_PROVINCES: ProvinceFeature[] = []

const INDICATOR_LABEL: Record<Indicator, string> = {
  capacity: '总装机',
  spot: '现货均价',
  medium_long: '中长期均价',
  trade: '省间交易',
}

export function MapContainer() {
  const { data: geo, error: geoError, loading: geoLoading } = useChinaGeo()
  const indicator = useDataStore((s) => s.indicator)
  const year = useDataStore((s) => s.year)
  const isPrice = indicator === 'spot' || indicator === 'medium_long'

  const capacityRes = useCapacityData()
  const priceRes = usePriceData(isPrice ? indicator : null)

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

  // 省份质心（异常标注定位）
  const centroidByAdcode = useMemo(() => {
    const m: Record<string, [number, number]> = {}
    if (pathGen)
      provinces.forEach((f) => {
        const c = pathGen.centroid(f)
        if (Number.isFinite(c[0]) && Number.isFinite(c[1])) m[adcodeOf(f)] = [c[0], c[1]]
      })
    return m
  }, [provinces, pathGen])

  // 装机对数色阶
  const capValues = useMemo(
    () =>
      capacityRes.data ? Array.from(capacityRes.data.byAdcode.values()).map((i) => i.total_mw) : [],
    [capacityRes.data],
  )
  const capDomain = useMemo<[number, number]>(() => {
    if (!capValues.length) return [1, 1000]
    return [Math.min(...capValues), Math.max(...capValues)]
  }, [capValues])
  const capacityScale = useMemo(() => makeCapacityScale(capDomain), [capDomain])

  // 电价阈值色阶（分位数断点）
  const priceValues = useMemo(() => {
    if (!isPrice || !priceRes.data) return []
    return Array.from(priceRes.data.byAdcode.values()).map((i) =>
      indicator === 'spot' ? i.spot_avg_yuan_mwh : i.medium_long_avg_yuan_mwh,
    )
  }, [isPrice, indicator, priceRes.data])
  const priceScaleInfo = useMemo(
    () =>
      makePriceThresholdScale(priceValues, indicator === 'medium_long' ? 'medium_long' : 'spot'),
    [priceValues, indicator],
  )

  // 当前指标的填色函数
  const getFill = useCallback(
    (code: string) => {
      if (isPrice) {
        const it = priceRes.data?.byAdcode.get(code)
        if (!it) return NO_DATA_COLOR
        const v = indicator === 'spot' ? it.spot_avg_yuan_mwh : it.medium_long_avg_yuan_mwh
        return priceScaleInfo.scale(v)
      }
      const it = capacityRes.data?.byAdcode.get(code)
      return it ? capacityScale(it.total_mw) : NO_DATA_COLOR
    },
    [isPrice, indicator, priceRes.data, capacityRes.data, capacityScale, priceScaleInfo],
  )

  // 图例分段
  const legend = useMemo(() => {
    if (isPrice) {
      const th = priceScaleInfo.thresholds
      const colors = priceScaleInfo.colors
      if (!th.length) {
        return {
          label: '电价（元/MWh）',
          segments: [{ color: colors[0] ?? NO_DATA_COLOR, label: '—' }],
        }
      }
      const segments = colors.map((color, i) => {
        if (i === 0) return { color, label: `≤${th[0]}` }
        if (i === th.length) return { color, label: `>${th[th.length - 1]}` }
        return { color, label: `${th[i - 1]}–${th[i]}` }
      })
      return {
        label: indicator === 'spot' ? '现货均价（元/MWh）' : '中长期均价（元/MWh）',
        segments,
      }
    }
    const [min, max] = capDomain
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min * (max / min) ** t)
    return {
      label: '总装机',
      segments: ticks.map((v) => ({ color: capacityScale(v), label: formatPower(v) })),
    }
  }, [isPrice, indicator, priceScaleInfo, capDomain, capacityScale])

  // 电价异常标注（负电价 / 触及限价）
  const anomalyMarks = useMemo<AnomalyMark[]>(() => {
    if (!isPrice || !priceRes.data) return []
    const out: AnomalyMark[] = []
    for (const it of priceRes.data.byAdcode.values()) {
      if (!it.is_anomaly) continue
      const c = centroidByAdcode[it.province_code]
      if (c)
        out.push({ code: it.province_code, cx: c[0], cy: c[1], reason: it.anomaly_reason ?? '' })
    }
    return out
  }, [isPrice, priceRes.data, centroidByAdcode])

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

  const loading = geoLoading || capacityRes.loading || (isPrice && priceRes.loading)
  const dataError = isPrice ? priceRes.error : capacityRes.error

  return (
    <div className="relative h-full w-full overflow-hidden bg-map-bg">
      {/* 标题 */}
      <div className="pointer-events-none absolute left-5 top-4 z-10">
        <h1 className="text-lg font-semibold text-white">全国电力数据可视化地图</h1>
        <p className="text-xs text-slate-400">指标：{INDICATOR_LABEL[indicator]} · Phase 3</p>
      </div>

      {/* 指标切换 */}
      <ControlBar />

      {/* 右上控制：时间 + 重置 */}
      <div className="absolute right-5 top-4 z-10 flex items-center gap-2">
        <TimeSelector />
        <button
          type="button"
          onClick={handleResetView}
          className="rounded-md border border-map-border bg-map-panel/80 px-3 py-1.5 text-xs text-slate-200 backdrop-blur transition-colors hover:border-map-accent"
        >
          重置视图
        </button>
      </div>

      {dataError && (
        <div className="absolute left-1/2 top-14 z-10 -translate-x-1/2 rounded-md border border-red-500/40 bg-red-950/70 px-3 py-1 text-xs text-red-300">
          数据加载失败：{dataError.message}
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
          <AnomalyLayer marks={anomalyMarks} />
        </g>

        {southChinaSea && (
          <SouthChinaSeaInset feature={southChinaSea} width={VIEW_WIDTH} height={VIEW_HEIGHT} />
        )}
      </svg>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-slate-400">
          正在加载数据…
        </div>
      )}

      {!isPrice && capacityRes.data && (
        <SummaryCard
          summary={capacityRes.data.summary}
          items={Array.from(capacityRes.data.byAdcode.values())}
          year={year}
        />
      )}
      <Legend label={legend.label} segments={legend.segments} />

      <Tooltip
        capacityByAdcode={capacityRes.data?.byAdcode}
        priceByAdcode={isPrice ? priceRes.data?.byAdcode : undefined}
      />
      <DetailPanel
        capacityByAdcode={capacityRes.data?.byAdcode}
        priceByAdcode={isPrice ? priceRes.data?.byAdcode : undefined}
      />
    </div>
  )
}
