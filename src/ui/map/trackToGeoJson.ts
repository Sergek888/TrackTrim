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

export type TrackMarkersFeatureCollectionGeoJson = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: {
      type: 'Point'
      coordinates: number[]
    }
    properties: {
      featureIndex: number
      kind: 'start' | 'finish'
      label: 'S' | 'F'
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

export function tracksToMarkerFeatureCollectionGeoJson(
  tracks: readonly Track[],
): TrackMarkersFeatureCollectionGeoJson {
  return {
    type: 'FeatureCollection',
    features: tracks.flatMap((track, featureIndex) => {
      const firstPoint = track.firstPoint()
      const lastPoint = track.lastPoint()
      const markers: TrackMarkersFeatureCollectionGeoJson['features'] = []

      if (firstPoint !== null) {
        markers.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [firstPoint.lon, firstPoint.lat],
          },
          properties: {
            featureIndex,
            kind: 'start',
            label: 'S',
          },
        })
      }

      if (lastPoint !== null) {
        markers.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lastPoint.lon, lastPoint.lat],
          },
          properties: {
            featureIndex,
            kind: 'finish',
            label: 'F',
          },
        })
      }

      return markers
    }),
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
