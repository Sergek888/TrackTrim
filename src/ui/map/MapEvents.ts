import type maplibregl from 'maplibre-gl'
import type { Track } from '../../model/Track'
import type { TrackMapPoint } from './TrackMap'
import { trackBounds } from './mapBounds'
import { queryTrackFeatures, resetInteractiveCursor, setInteractiveCursor } from './mapHitTest'

type MapEventsCallbacks = {
  onTrackClick: (track: Track, point: TrackMapPoint) => void
  onMapClick: () => void
}

const TRACK_HIT_PREFILTER_TOLERANCE = 24
const trackBoundsCache = new WeakMap<Track, maplibregl.LngLatBounds | null>()

export function bindMapEvents(
  map: maplibregl.Map,
  callbacks: MapEventsCallbacks,
  getTracks: () => readonly Track[],
): () => void {
  let pendingMove: maplibregl.MapMouseEvent | null = null
  let animationFrame: number | null = null

  const handleMouseMove = (event: maplibregl.MapMouseEvent) => {
    pendingMove = event
    if (animationFrame !== null) return
    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = null
      const next = pendingMove
      pendingMove = null
      if (next === null) return
      const candidateIndexes = findTrackIndexesNearPoint(map, next.point, getTracks())
      if (candidateIndexes.size === 0) {
        resetInteractiveCursor(map)
        return
      }
      queryTrackFeatures(map, next.point, candidateIndexes).length > 0
      ? setInteractiveCursor(map)
      : resetInteractiveCursor(map)
    })
  }

  const handleClick = (event: maplibregl.MapMouseEvent) => {
    const candidateIndexes = findTrackIndexesNearPoint(map, event.point, getTracks())
    const index = candidateIndexes.size === 0 ? undefined : queryTrackFeatures(map, event.point, candidateIndexes)[0]?.properties?.featureIndex
    const track = typeof index === 'number' ? getTracks()[index] : undefined
    if (track === undefined) callbacks.onMapClick()
    else callbacks.onTrackClick(track, { latitude: event.lngLat.lat, longitude: event.lngLat.lng, x: event.point.x, y: event.point.y })
  }

  map.on('mousemove', handleMouseMove)
  map.on('click', handleClick)

  return () => {
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
    map.off('mousemove', handleMouseMove)
    map.off('click', handleClick)
  }
}

function findTrackIndexesNearPoint(map: maplibregl.Map, point: maplibregl.Point, tracks: readonly Track[]): Set<number> {
  const sw = map.unproject([point.x - TRACK_HIT_PREFILTER_TOLERANCE, point.y + TRACK_HIT_PREFILTER_TOLERANCE])
  const ne = map.unproject([point.x + TRACK_HIT_PREFILTER_TOLERANCE, point.y - TRACK_HIT_PREFILTER_TOLERANCE])
  const result = new Set<number>()

  tracks.forEach((track, index) => {
    const bounds = getCachedTrackBounds(track)
    if (bounds !== null && boundsIntersects(bounds, sw.lng, sw.lat, ne.lng, ne.lat)) result.add(index)
  })

  return result
}

function getCachedTrackBounds(track: Track): maplibregl.LngLatBounds | null {
  const cached = trackBoundsCache.get(track)
  if (cached !== undefined) return cached
  const bounds = trackBounds(track)
  trackBoundsCache.set(track, bounds)
  return bounds
}

function boundsIntersects(bounds: maplibregl.LngLatBounds, west: number, south: number, east: number, north: number): boolean {
  return bounds.getWest() <= east && bounds.getEast() >= west && bounds.getSouth() <= north && bounds.getNorth() >= south
}
