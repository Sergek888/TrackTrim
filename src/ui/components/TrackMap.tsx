import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike } from 'maplibre-gl'
import type { Track } from '../../model/Track'
import { trackToLineGeoJson, type TrackLineGeoJson } from '../map/trackToGeoJson'

type TrackMapProps = {
  track: Track
  removedTrack?: Track | null
  boundsTrack: Track
  selectedPoint?: TrackMapPoint | null
  onTrackClick?: (point: TrackMapPoint) => void
}

export type TrackMapPoint = {
  latitude: number
  longitude: number
}

const TRACK_SOURCE_ID = 'track'
const TRACK_LAYER_ID = 'track-line'
const REMOVED_TRACK_SOURCE_ID = 'removed-track'
const REMOVED_TRACK_LAYER_ID = 'removed-track-line'
const EMPTY_LINE_GEOJSON: TrackLineGeoJson = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: [],
  },
  properties: {},
}

function trackBounds(track: Track): LngLatBoundsLike | null {
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

function setInteractiveCursor(map: maplibregl.Map): void {
  map.getCanvas().style.cursor = 'pointer'
}

function resetInteractiveCursor(map: maplibregl.Map): void {
  map.getCanvas().style.cursor = ''
}

function emitTrackClick(
  event: maplibregl.MapLayerMouseEvent,
  onTrackClick: ((point: TrackMapPoint) => void) | undefined,
): void {
  onTrackClick?.({
    latitude: event.lngLat.lat,
    longitude: event.lngLat.lng,
  })
}

export default function TrackMap({
  track,
  removedTrack = null,
  boundsTrack,
  selectedPoint = null,
  onTrackClick,
}: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const fittedBoundsTrackRef = useRef<Track | null>(null)
  const latestTrackRef = useRef(track)
  const latestRemovedTrackRef = useRef(removedTrack)
  const latestBoundsTrackRef = useRef(boundsTrack)
  const latestOnTrackClickRef = useRef(onTrackClick)
  const isMapReadyRef = useRef(false)

  latestTrackRef.current = track
  latestRemovedTrackRef.current = removedTrack
  latestBoundsTrackRef.current = boundsTrack
  latestOnTrackClickRef.current = onTrackClick

  useEffect(() => {
    if (containerRef.current === null || mapRef.current !== null) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: 'OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [0, 0],
      zoom: 1,
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      isMapReadyRef.current = true

      map.addSource(REMOVED_TRACK_SOURCE_ID, {
        type: 'geojson',
        data:
          latestRemovedTrackRef.current === null
            ? EMPTY_LINE_GEOJSON
            : trackToLineGeoJson(latestRemovedTrackRef.current),
      })
      map.addLayer({
        id: REMOVED_TRACK_LAYER_ID,
        type: 'line',
        source: REMOVED_TRACK_SOURCE_ID,
        paint: {
          'line-color': '#6b7280',
          'line-width': 5,
          'line-opacity': 0.55,
        },
      })
      map.addSource(TRACK_SOURCE_ID, {
        type: 'geojson',
        data: trackToLineGeoJson(latestTrackRef.current),
      })
      map.addLayer({
        id: TRACK_LAYER_ID,
        type: 'line',
        source: TRACK_SOURCE_ID,
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      })
      map.on('mouseenter', TRACK_LAYER_ID, () => setInteractiveCursor(map))
      map.on('mouseleave', TRACK_LAYER_ID, () => resetInteractiveCursor(map))
      map.on('click', TRACK_LAYER_ID, (event) => {
        emitTrackClick(event, latestOnTrackClickRef.current)
      })
      map.on('mouseenter', REMOVED_TRACK_LAYER_ID, () => setInteractiveCursor(map))
      map.on('mouseleave', REMOVED_TRACK_LAYER_ID, () => resetInteractiveCursor(map))
      map.on('click', REMOVED_TRACK_LAYER_ID, (event) => {
        emitTrackClick(event, latestOnTrackClickRef.current)
      })

      const currentBoundsTrack = latestBoundsTrackRef.current
      const bounds = trackBounds(currentBoundsTrack)

      if (bounds !== null && fittedBoundsTrackRef.current !== currentBoundsTrack) {
        map.fitBounds(bounds, { padding: 48, duration: 0, maxZoom: 16 })
        fittedBoundsTrackRef.current = currentBoundsTrack
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      fittedBoundsTrackRef.current = null
      isMapReadyRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current

    if (map === null || !isMapReadyRef.current) {
      return
    }

    const source = map.getSource(TRACK_SOURCE_ID) as GeoJSONSource | undefined

    source?.setData(trackToLineGeoJson(track))
  }, [track])

  useEffect(() => {
    const map = mapRef.current

    if (map === null || !isMapReadyRef.current) {
      return
    }

    const source = map.getSource(REMOVED_TRACK_SOURCE_ID) as GeoJSONSource | undefined

    source?.setData(removedTrack === null ? EMPTY_LINE_GEOJSON : trackToLineGeoJson(removedTrack))
  }, [removedTrack])

  useEffect(() => {
    const map = mapRef.current

    if (map === null || !isMapReadyRef.current) {
      return
    }

    if (selectedPoint === null) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    if (markerRef.current === null) {
      markerRef.current = new maplibregl.Marker({ color: '#111827' })
        .setLngLat([selectedPoint.longitude, selectedPoint.latitude])
        .addTo(map)
      return
    }

    markerRef.current.setLngLat([selectedPoint.longitude, selectedPoint.latitude])
  }, [selectedPoint])

  useEffect(() => {
    const map = mapRef.current

    if (map === null || !isMapReadyRef.current || fittedBoundsTrackRef.current === boundsTrack) {
      return
    }

    const bounds = trackBounds(boundsTrack)

    if (bounds !== null) {
      map.fitBounds(bounds, { padding: 48, duration: 0, maxZoom: 16 })
      fittedBoundsTrackRef.current = boundsTrack
    }
  }, [boundsTrack])

  return <div className="track-map" ref={containerRef} aria-label="Track map" />
}
