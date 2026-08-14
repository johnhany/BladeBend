import { geoAlbers, geoPath, type GeoPath, type GeoProjection } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'

/**
 * 创建适配中国版图的 Albers 等面积投影（参考 SDD §3.1.1）。
 *
 * - rotate [-105, 0]：中央经线 105°E
 * - parallels [25, 47]：标准纬线，覆盖中国主要纬度带
 * - fitExtent：根据要素集合自适应缩放与平移，保证版图充满视口
 */
export function createChinaProjection<G extends Geometry = Geometry>(
  width: number,
  height: number,
  collection: FeatureCollection<G>,
): GeoProjection {
  return geoAlbers()
    .rotate([-105, 0])
    .parallels([25, 47])
    .fitExtent(
      [
        [width * 0.04, height * 0.04],
        [width * 0.96, height * 0.96],
      ],
      collection,
    )
}

/** 创建地理路径生成器，将 GeoJSON 要素转换为 SVG path 的 d 属性。 */
export function createGeoPath(projection: GeoProjection): GeoPath {
  return geoPath(projection)
}
