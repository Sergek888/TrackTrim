import type maplibregl from 'maplibre-gl'
import type { Track } from '../../model/Track'
import type { TrackMapPoint } from './TrackMap'
import { queryTrackFeatures, resetInteractiveCursor, setInteractiveCursor } from './mapHitTest'

type MapEventsCallbacks = {
  onTrackClick: (track: Track, point: TrackMapPoint) => void
  onMapClick: () => void
}

export function bindMapEvents(
  map: maplibregl.Map,
  callbacks: MapEventsCallbacks,
  getTracks: () => readonly Track[],
): void {
  map.on('mousemove', (event) => {
    queryTrackFeatures(map, event.point).length > 0
      ? setInteractiveCursor(map)
      : resetInteractiveCursor(map)
  })

  map.on('click', (event) => {
    const index = queryTrackFeatures(map, event.point)[0]?.properties?.featureIndex
    const track = typeof index === 'number' ? getTracks()[index] : undefined
    if (track === undefined) callbacks.onMapClick()
    else callbacks.onTrackClick(track, { latitude: event.lngLat.lat, longitude: event.lngLat.lng, x: event.point.x, y: event.point.y })
  })
}
