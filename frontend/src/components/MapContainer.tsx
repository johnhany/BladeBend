import { useCallback, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import {
  select,
  zoom,
  zoomIdentity,
  interpolateCividis,
  interpolatePlasma,
  type ZoomBehavior,
} from 'd3'
import { useChinaGeo } from '@/hooks/useChinaGeo'
import { useCapacityData } from '@/hooks/useCapacityData'
import { usePriceData } from '@/hooks/usePriceData'
import { useEnergyAnnual } from '@/hooks/useEnergyData'
import { useChannels } from '@/hooks/useChannels'
import { useFlows } from '@/hooks/useFlows'
import { useMapStore } from '@/stores/mapStore'
import { useDataStore } from '@/stores/dataStore'
import { useUIStore } from '@/stores/uiStore'
import { adcodeOf, type ProvinceFeature } from '@/types/geo'
import { createChinaProjection, createGeoPath } from '@/utils/projection'
import {
  formatEnergyGwh,
  formatPower,
  makeCapacityScale,
  makeEnergyScale,
  makePriceThresholdScale,
  NO_DATA_COLOR,
} from '@/utils/colorScales'
import type { Indicator } from '@/types/data'
import { ChannelLayer } from './ChannelLayer'
import { CITIES, CityLayer } from './CityLayer'
import { ControlBar } from './ControlBar'
import { DetailPanel } from './DetailPanel'
import { FlowLayer } from './FlowLayer'
import { LayerToggles } from './LayerToggles'
import { Legend } from './Legend'
import { ProvinceLayer } from './ProvinceLayer'
import { SearchBox } from './SearchBox'
import { SummaryCard } from './SummaryCard'
import { SouthChinaSeaInset } from './SouthChinaSeaInset'
import { TerrainLayer } from './TerrainLayer'
import { TimeSelector } from './TimeSelector'
import { Tooltip } from './Tooltip'

const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 760
const NO_PROVINCES: ProvinceFeature[] = []

const INDICATOR_LABEL: Record<Indicator, string> = {
  capacity: '总装机',
  generation: '年度发电量',
  consumption: '年度用电量',
  spot: '现货年度均价',
  medium_long: '中长期年度均价',
  trade: '跨区域受送电',
}

// 跨区域受送电配色：送出=绿系 / 受入=橙系（深→浅表示电量增大）
const SENT_COLORS = ['#0e5a31', '#187a44', '#2aa05a', '#57c47f', '#9fe3ba']
const RECV_COLORS = ['#7c3a10', '#a55a1a', '#cf7c28', '#eda452', '#f8cf94']

export function MapContainer() {
  const { data: geo, error: geoError, loading: geoLoading } = useChinaGeo()
  const indicator = useDataStore((s) => s.indicator)
  const year = useDataStore((s) => s.year)
  const isPrice = indicator === 'spot' || indicator === 'medium_long'
  const isTrade = indicator === 'trade'
  const isEnergy = indicator === 'generation' || indicator === 'consumption'

  const capacityRes = useCapacityData()
  // 电价年度聚合常驻加载（悬停弹窗在任意视图都需要年度均价；着色字段由 indicator 决定）
  const priceRes = usePriceData(indicator === 'medium_long' ? 'medium_long' : 'spot')
  const energyAnnualRes = useEnergyAnnual()
  const channelsRes = useChannels()
  const { flows } = useFlows()

  const showCities = useUIStore((s) => s.showCities)
  const showChannels = useUIStore((s) => s.showChannels)
  const showRivers = useUIStore((s) => s.showRivers)
  const setChannelsVisible = useUIStore((s) => s.setChannelsVisible)
  const highlightChannel = useUIStore((s) => s.highlightChannel)
  const focus = useUIStore((s) => s.focus)

  const setMousePos = useMapStore((s) => s.setMousePos)
  const setZoomScale = useMapStore((s) => s.setZoomScale)
  const clearSelected = useMapStore((s) => s.clearSelected)

  const svgRef = useRef<SVGSVGElement>(null)
  const zoomGRef = useRef<SVGGElement>(null)
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const provinces = geo?.provinces ?? NO_PROVINCES
  const southChinaSea = geo?.southChinaSea ?? null
  const channels = channelsRes.data ?? []
  const energyAnnual = energyAnnualRes.byAdcode

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

  // 省份质心（异常标注 / 受送电连线定位）
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

  // 电价年度均价阈值色阶
  const priceValues = useMemo(() => {
    if (!isPrice || !priceRes.data) return []
    return Array.from(priceRes.data.byAdcode.values())
      .map((p) => (indicator === 'spot' ? p.spot_avg : p.mlt_avg))
      .filter((v): v is number => v != null)
  }, [isPrice, indicator, priceRes.data])
  const priceScaleInfo = useMemo(
    () =>
      makePriceThresholdScale(priceValues, indicator === 'medium_long' ? 'medium_long' : 'spot'),
    [priceValues, indicator],
  )

  // 跨区域受送电色阶：送出（绿）/ 受入（橙）
  const sentValues = useMemo(() => {
    if (!isTrade || !energyAnnual) return []
    return Array.from(energyAnnual.values())
      .map((e) => e.sent_gwh)
      .filter((v): v is number => v != null)
  }, [isTrade, energyAnnual])
  const recvValues = useMemo(() => {
    if (!isTrade || !energyAnnual) return []
    return Array.from(energyAnnual.values())
      .map((e) => e.received_gwh)
      .filter((v): v is number => v != null)
  }, [isTrade, energyAnnual])
  const sentScaleInfo = useMemo(
    () => makePriceThresholdScale(sentValues, 'spot', SENT_COLORS),
    [sentValues],
  )
  const recvScaleInfo = useMemo(
    () => makePriceThresholdScale(recvValues, 'spot', RECV_COLORS),
    [recvValues],
  )

  // 年度电量（发电/用电）对数色阶
  const energyValues = useMemo(() => {
    if (!isEnergy || !energyAnnual) return []
    return Array.from(energyAnnual.values())
      .map((e) => (indicator === 'generation' ? e.generation_gwh : e.consumption_gwh))
      .filter((v): v is number => v != null)
  }, [isEnergy, indicator, energyAnnual])
  const energyDomain = useMemo<[number, number]>(() => {
    if (!energyValues.length) return [100, 1000]
    return [Math.min(...energyValues), Math.max(...energyValues)]
  }, [energyValues])
  const energyScale = useMemo(
    () =>
      makeEnergyScale(
        energyDomain,
        indicator === 'generation' ? interpolatePlasma : interpolateCividis,
      ),
    [energyDomain, indicator],
  )

  // 省填色：装机 viridis / 电价年度均价分档 / 跨区域送出绿·受入橙
  const getFill = useCallback(
    (code: string) => {
      if (isEnergy) {
        const en = energyAnnual?.get(code)
        if (!en) return NO_DATA_COLOR
        const v = indicator === 'generation' ? en.generation_gwh : en.consumption_gwh
        if (v == null) return NO_DATA_COLOR
        return energyScale(v)
      }
      if (isTrade) {
        const en = energyAnnual?.get(code)
        if (!en) return NO_DATA_COLOR
        if (en.sent_gwh != null) return sentScaleInfo.scale(en.sent_gwh)
        if (en.received_gwh != null) return recvScaleInfo.scale(en.received_gwh)
        return NO_DATA_COLOR
      }
      if (isPrice) {
        const p = priceRes.data?.byAdcode.get(code)
        if (!p) return NO_DATA_COLOR
        const v = indicator === 'spot' ? p.spot_avg : p.mlt_avg
        if (v == null) return NO_DATA_COLOR
        return priceScaleInfo.scale(v)
      }
      const it = capacityRes.data?.byAdcode.get(code)
      return it ? capacityScale(it.total_mw) : NO_DATA_COLOR
    },
    [
      isEnergy,
      isTrade,
      isPrice,
      indicator,
      energyAnnual,
      energyScale,
      sentScaleInfo,
      recvScaleInfo,
      priceRes.data,
      capacityRes.data,
      capacityScale,
      priceScaleInfo,
    ],
  )

  // 图例
  const legend = useMemo(() => {
    if (isEnergy) {
      const [min, max] = energyDomain
      const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min * (max / min) ** t)
      return {
        label: indicator === 'generation' ? '年度发电量' : '年度用电量',
        segments: ticks.map((v) => ({
          color: energyScale(v),
          label: formatEnergyGwh(v),
        })),
        segments2: null as { color: string; label: string }[] | null,
      }
    }
    if (isTrade) {
      const seg = (th: number[], colors: string[]) => {
        if (!th.length) return colors.map((color) => ({ color, label: '—' }))
        return colors.map((color, i) => {
          if (i === 0) return { color, label: `≤${formatEnergyGwh(th[0])}` }
          if (i === th.length) return { color, label: `>${formatEnergyGwh(th[th.length - 1])}` }
          return { color, label: `${formatEnergyGwh(th[i - 1])}–${formatEnergyGwh(th[i])}` }
        })
      }
      if (!sentScaleInfo.thresholds.length)
        return {
          label: '年度受送电量',
          segments: [{ color: NO_DATA_COLOR, label: '—' }],
          segments2: null as { color: string; label: string }[] | null,
        }
      return {
        label: '年度送出电量（绿）',
        segments: seg(sentScaleInfo.thresholds, sentScaleInfo.colors),
        segments2: recvScaleInfo.thresholds.length
          ? seg(recvScaleInfo.thresholds, recvScaleInfo.colors)
          : null,
      }
    }
    if (isPrice) {
      const th = priceScaleInfo.thresholds
      const colors = priceScaleInfo.colors
      if (!th.length)
        return {
          label: '电价（元/MWh）',
          segments: [{ color: colors[0] ?? NO_DATA_COLOR, label: '—' }],
          segments2: null as { color: string; label: string }[] | null,
        }
      const segments = colors.map((color, i) => {
        if (i === 0) return { color, label: `≤${th[0]}` }
        if (i === th.length) return { color, label: `>${th[th.length - 1]}` }
        return { color, label: `${th[i - 1]}–${th[i]}` }
      })
      return {
        label: indicator === 'spot' ? '现货年度均价（元/MWh）' : '中长期年度均价（元/MWh）',
        segments,
        segments2: null as { color: string; label: string }[] | null,
      }
    }
    const [min, max] = capDomain
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min * (max / min) ** t)
    return {
      label: '总装机',
      segments: ticks.map((v) => ({ color: capacityScale(v), label: formatPower(v) })),
      segments2: null as { color: string; label: string }[] | null,
    }
  }, [
    isEnergy,
    isTrade,
    isPrice,
    indicator,
    energyDomain,
    energyScale,
    priceScaleInfo,
    capDomain,
    capacityScale,
    sentScaleInfo,
    recvScaleInfo,
  ])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        zoomGRef.current?.setAttribute('transform', event.transform.toString())
        setZoomScale(event.transform.k)
      })
    zoomBehaviorRef.current = z
    const selection = select(svg).call(z).on('dblclick.zoom', null)
    return () => {
      selection.on('.zoom', null)
    }
  }, [])

  // 切换到跨区域受送电指标时自动开启一次通道图层（此后允许手动关闭，不强制）
  useEffect(() => {
    if (isTrade) setChannelsVisible(true)
    // 故意不依赖 showChannels：避免手动关闭后被立即重开
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTrade])

  // 搜索定位：缩放平移至目标（省份 bbox / 通道起止 / 城市点）
  useEffect(() => {
    if (!focus || !zoomBehaviorRef.current || !svgRef.current) return
    let box: [[number, number], [number, number]] | null = null
    if (focus.kind === 'province') {
      const f = provinces.find((p) => adcodeOf(p) === focus.id)
      if (f && pathGen) {
        const b = pathGen.bounds(f)
        box = [
          [b[0][0], b[0][1]],
          [b[1][0], b[1][1]],
        ]
      }
    } else if (focus.kind === 'channel') {
      const ch = channels.find((c) => c.id === focus.id)
      if (ch && projection) {
        const p1 = projection([ch.start_point.lng, ch.start_point.lat])
        const p2 = projection([ch.end_point.lng, ch.end_point.lat])
        if (p1 && p2)
          box = [
            [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1])],
            [Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1])],
          ]
      }
    } else {
      const c = CITIES.find((x) => x.name === focus.id)
      if (c && projection) {
        const p = projection([c.lng, c.lat])
        if (p)
          box = [
            [p[0] - 45, p[1] - 45],
            [p[0] + 45, p[1] + 45],
          ]
      }
    }
    if (!box) return
    const w = Math.max(box[1][0] - box[0][0], 1)
    const h = Math.max(box[1][1] - box[0][1], 1)
    const k = Math.max(1, Math.min(8, 0.85 * Math.min(VIEW_WIDTH / w, VIEW_HEIGHT / h)))
    const cx = (box[0][0] + box[1][0]) / 2
    const cy = (box[0][1] + box[1][1]) / 2
    select(svgRef.current).call(
      zoomBehaviorRef.current.transform,
      zoomIdentity.translate(VIEW_WIDTH / 2 - k * cx, VIEW_HEIGHT / 2 - k * cy).scale(k),
    )
  }, [focus, provinces, channels, pathGen, projection])

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

  const loading =
    geoLoading || capacityRes.loading || (isPrice && priceRes.loading) || energyAnnualRes.loading
  const dataError = isPrice ? priceRes.error : capacityRes.error

  return (
    <div className="relative h-full w-full overflow-hidden bg-map-bg">
      {/* 标题 */}
      <div className="pointer-events-none absolute left-5 top-4 z-10">
        <h1 className="text-lg font-semibold text-white">全国电力数据可视化地图</h1>
        <p className="text-xs text-slate-400">指标：{INDICATOR_LABEL[indicator]} · 年度</p>
      </div>

      <ControlBar />
      <SearchBox provinces={provinces} channels={channels} />

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

      {(dataError || channelsRes.error) && (
        <div className="absolute left-1/2 top-14 z-10 -translate-x-1/2 rounded-md border border-red-500/40 bg-red-950/70 px-3 py-1 text-xs text-red-300">
          数据加载失败：{(dataError ?? channelsRes.error)?.message}
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
          {showRivers && projection && <TerrainLayer projection={projection} />}
          {showChannels && projection && (
            <ChannelLayer
              channels={channels}
              projection={projection}
              highlightedId={highlightChannel}
            />
          )}
          {isTrade && <FlowLayer flows={flows} centroidByAdcode={centroidByAdcode} />}
          {showCities && projection && <CityLayer projection={projection} />}
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

      {indicator === 'capacity' && capacityRes.data && (
        <SummaryCard
          summary={capacityRes.data.summary}
          items={Array.from(capacityRes.data.byAdcode.values())}
          year={year}
        />
      )}
      <Legend label={legend.label} segments={legend.segments} />
      {legend.segments2 && (
        <Legend
          label="年度受入电量（橙）"
          segments={legend.segments2}
          offsetClass="bottom-48 left-5"
        />
      )}
      <LayerToggles />

      <Tooltip
        capacityByAdcode={capacityRes.data?.byAdcode}
        annualPriceByAdcode={priceRes.data?.byAdcode ?? undefined}
        energyAnnualByAdcode={energyAnnual ?? undefined}
      />
      <DetailPanel
        capacityByAdcode={capacityRes.data?.byAdcode}
        annualPriceByAdcode={priceRes.data?.byAdcode ?? undefined}
      />
    </div>
  )
}
