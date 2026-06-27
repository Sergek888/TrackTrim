import maplibregl, { type LngLatBoundsLike } from 'maplibre-gl'
import type { Track } from '../../model/Track'

export function trackBounds(track: Track): maplibregl.LngLatBounds | null {
  const points = track.getPoints()
  const firstPoint = points[0] ?? null

  if (firstPoint === null) {
    return null
  }

  const bounds = new maplibregl.LngLatBounds(
    [firstPoint.lon, firstPoint.lat],
    [firstPoint.lon, firstPoint.lat],
  )

  for (const point of points.slice(1)) {
    bounds.extend([point.lon, point.lat])
  }

  return bounds
}

export function allTracksBounds(tracks: readonly Track[]): LngLatBoundsLike | null {
  let bounds: maplibregl.LngLatBounds | null = null

  for (const track of tracks) {
    const points = track.getPoints()

    for (const point of points) {
      if (bounds === null) {
        bounds = new maplibregl.LngLatBounds([point.lon, point.lat], [point.lon, point.lat])
        continue
      }

      bounds.extend([point.lon, point.lat])
    }
  }

  return bounds
}
