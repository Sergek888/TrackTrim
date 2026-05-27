import type { Track } from '../../model/Track'

export type TrackLineGeoJson = {
  type: 'Feature'
  geometry: {
    type: 'LineString'
    coordinates: number[][]
  }
  properties: Record<string, never>
}

export function trackToLineGeoJson(track: Track): TrackLineGeoJson {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: track.getPoints().map((point) => [point.lon, point.lat]),
    },
    properties: {},
  }
}
