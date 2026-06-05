import type { Track } from '../../model/Track'

export type TrackLineGeoJson = {
  type: 'Feature'
  geometry: {
    type: 'LineString'
    coordinates: number[][]
  }
  properties: Record<string, never>
}

export type TracksFeatureCollectionGeoJson = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: {
      type: 'LineString'
      coordinates: number[][]
    }
    properties: {
      featureIndex: number
      color: string
      active: boolean
    }
  }>
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

export function tracksToFeatureCollectionGeoJson(
  tracks: readonly Track[],
  activeTrack: Track | null,
): TracksFeatureCollectionGeoJson {
  return {
    type: 'FeatureCollection',
    features: tracks.map((track, featureIndex) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: track.getPoints().map((point) => [point.lon, point.lat]),
      },
      properties: {
        featureIndex,
        color: track.meta?.color ?? '#2563eb',
        active: track === activeTrack,
      },
    })),
  }
}
