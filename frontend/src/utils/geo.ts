import type { Feature, FeatureCollection, Geometry, Position } from 'geojson'

/**
 * d3-geo 的多边形渲染约定：外环顺时针(CW)、洞逆时针(CCW)。
 *
 * DataV 等数据源的外环常为逆时针(CCW)，会导致 d3-geo 把整块陆地当作"洞"，
 * 进而把整个球面（裁剪圆）绘制出来——表现为覆盖全图的新月形弧线。
 * 本函数按平面 shoelace 面积符号修正环方向。
 */

function ringSignedArea(ring: Position[]): number {
  let s = 0
  for (let i = 0; i < ring.length - 1; i++) {
    s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return s // >0 = CCW，<0 = CW
}

function rewindRing(ring: Position[], exterior: boolean): Position[] {
  const isCw = ringSignedArea(ring) < 0
  if (exterior !== isCw) return ring.slice().reverse()
  return ring
}

function rewindGeometry(geom: Geometry): Geometry {
  if (geom.type === 'Polygon') {
    return { ...geom, coordinates: geom.coordinates.map((r, i) => rewindRing(r, i === 0)) }
  }
  if (geom.type === 'MultiPolygon') {
    return {
      ...geom,
      coordinates: geom.coordinates.map((poly) => poly.map((r, i) => rewindRing(r, i === 0))),
    }
  }
  return geom
}

/** 原地规范化 FeatureCollection 的环方向，使其符合 d3-geo 渲染约定。 */
export function rewindFeatureCollection(fc: FeatureCollection<Geometry>): void {
  for (const f of fc.features as Feature<Geometry>[]) {
    f.geometry = rewindGeometry(f.geometry)
  }
}
