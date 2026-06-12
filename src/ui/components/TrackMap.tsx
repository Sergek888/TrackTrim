import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike } from 'maplibre-gl'
import type { Track } from '../../model/Track'
import {
  activeTrackToMarkerFeatureCollectionGeoJson,
  tracksToFeatureCollectionGeoJson,
  type TrackMarkersFeatureCollectionGeoJson,
  type TracksFeatureCollectionGeoJson,
} from '../map/trackToGeoJson'

type TrackMapProps = {
  tracks: readonly Track[]
  activeTrack: Track | null
  focusedTrack: {
    track: Track
    version: number
  } | null
  onTrackClick: (track: Track, point: TrackMapPoint) => void
  onMapClick: () => void
}

export type TrackMapPoint = {
  latitude: number
  longitude: number
  x: number
  y: number
}

const TRACKS_SOURCE_ID = 'tracks'
const TRACKS_LAYER_ID = 'track-lines'
const ACTIVE_TRACKS_LAYER_ID = 'active-track-lines'
const TRACK_MARKERS_SOURCE_ID = 'track-markers'
const TRACK_MARKERS_LAYER_ID = 'track-markers-symbols'
const TRACK_START_IMAGE_ID = 'track-start'
const TRACK_FINISH_IMAGE_ID = 'track-finish'
const INTERACTIVE_TRACK_LAYER_IDS = [ACTIVE_TRACKS_LAYER_ID, TRACKS_LAYER_ID]
const TRACK_MARKER_SIZE = 20
const EMPTY_TRACKS_GEOJSON: TracksFeatureCollectionGeoJson = {
  type: 'FeatureCollection',
  features: [],
}
const EMPTY_TRACK_MARKERS_GEOJSON: TrackMarkersFeatureCollectionGeoJson = {
  type: 'FeatureCollection',
  features: [],
}

function createTrackMarkerImage(kind: 'start' | 'finish'): ImageData {
  const canvas = document.createElement('canvas')
  const scale = 2
  const size = TRACK_MARKER_SIZE * scale
  const center = size / 2
  const radius = center - scale
  const context = canvas.getContext('2d')

  canvas.width = size
  canvas.height = size

  if (context === null) {
    return new ImageData(size, size)
  }

  context.save()
  context.beginPath()
  context.arc(center, center, radius, 0, Math.PI * 2)
  context.clip()

  if (kind === 'start') {
    context.fillStyle = '#16a34a'
    context.fillRect(0, 0, size, size)
  } else {
    const squareSize = 5 * scale

    for (let row = 0; row < size / squareSize; row += 1) {
      for (let column = 0; column < size / squareSize; column += 1) {
        context.fillStyle = (row + column) % 2 === 0 ? '#111827' : '#ffffff'
        context.fillRect(column * squareSize, row * squareSize, squareSize, squareSize)
      }
    }
  }

  context.restore()
  context.beginPath()
  context.arc(center, center, radius, 0, Math.PI * 2)
  context.strokeStyle = '#ffffff'
  context.lineWidth = 2 * scale
  context.stroke()

  return context.getImageData(0, 0, size, size)
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

function allTracksBounds(tracks: readonly Track[]): LngLatBoundsLike | null {
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

function setInteractiveCursor(map: maplibregl.Map): void {
  map.getCanvas().style.cursor = 'pointer'
}

function resetInteractiveCursor(map: maplibregl.Map): void {
  map.getCanvas().style.cursor = ''
}

export default function TrackMap({
  tracks,
  activeTrack,
  focusedTrack,
  onTrackClick,
  onMapClick,
}: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const latestTracksRef = useRef(tracks)
  const latestActiveTrackRef = useRef(activeTrack)
  const latestOnTrackClickRef = useRef(onTrackClick)
  const latestOnMapClickRef = useRef(onMapClick)
  const fittedInitialBoundsRef = useRef(false)
  const isMapReadyRef = useRef(false)

  latestTracksRef.current = tracks
  latestActiveTrackRef.current = activeTrack
  latestOnTrackClickRef.current = onTrackClick
  latestOnMapClickRef.current = onMapClick

  useEffect(() => {
    if (containerRef.current === null || mapRef.current !== null) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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
    map.addControl(new maplibregl.NavigationControl(), 'top-left')

    map.on('load', () => {
      isMapReadyRef.current = true

      map.addSource(TRACKS_SOURCE_ID, {
        type: 'geojson',
        data:
          latestTracksRef.current.length === 0
            ? EMPTY_TRACKS_GEOJSON
            : tracksToFeatureCollectionGeoJson(
                latestTracksRef.current,
                latestActiveTrackRef.current,
              ),
      })
      map.addLayer({
        id: TRACKS_LAYER_ID,
        type: 'line',
        source: TRACKS_SOURCE_ID,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          'line-sort-key': ['get', 'featureIndex'],
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': 0.72,
        },
      })
      map.addLayer({
        id: ACTIVE_TRACKS_LAYER_ID,
        type: 'line',
        source: TRACKS_SOURCE_ID,
        filter: ['==', ['get', 'active'], true],
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          'line-sort-key': ['get', 'featureIndex'],
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 6,
          'line-opacity': 0.95,
        },
      })
      map.addSource(TRACK_MARKERS_SOURCE_ID, {
        type: 'geojson',
        data: activeTrackToMarkerFeatureCollectionGeoJson(latestActiveTrackRef.current),
      })
      map.addImage(TRACK_START_IMAGE_ID, createTrackMarkerImage('start'), { pixelRatio: 2 })
      map.addImage(TRACK_FINISH_IMAGE_ID, createTrackMarkerImage('finish'), { pixelRatio: 2 })
      map.addLayer({
        id: TRACK_MARKERS_LAYER_ID,
        type: 'symbol',
        source: TRACK_MARKERS_SOURCE_ID,
        minzoom: 8,
        layout: {
          'icon-image': [
            'case',
            ['==', ['get', 'kind'], 'start'],
            TRACK_START_IMAGE_ID,
            TRACK_FINISH_IMAGE_ID,
          ],
          'icon-allow-overlap': true,
        },
      })

      map.on('mousemove', (event) => {
        const features = map.queryRenderedFeatures(event.point, {
          layers: INTERACTIVE_TRACK_LAYER_IDS,
        })

        if (features.length > 0) {
          setInteractiveCursor(map)
          return
        }

        resetInteractiveCursor(map)
      })
      map.on('click', (event) => {
        const features = map.queryRenderedFeatures(event.point, {
          layers: INTERACTIVE_TRACK_LAYER_IDS,
        })
        const featureIndex = features[0]?.properties?.featureIndex

        if (typeof featureIndex !== 'number') {
          latestOnMapClickRef.current()
          return
        }

        const track = latestTracksRef.current[featureIndex] ?? null

        if (track === null) {
          return
        }

        latestOnTrackClickRef.current(track, {
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
          x: event.point.x,
          y: event.point.y,
        })
      })

      const bounds = allTracksBounds(latestTracksRef.current)

      if (bounds !== null) {
        map.fitBounds(bounds, { padding: 64, duration: 0, maxZoom: 16 })
        fittedInitialBoundsRef.current = true
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
      fittedInitialBoundsRef.current = false
      isMapReadyRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current

    if (map === null || !isMapReadyRef.current) {
      return
    }

    const source = map.getSource(TRACKS_SOURCE_ID) as GeoJSONSource | undefined
    const markerSource = map.getSource(TRACK_MARKERS_SOURCE_ID) as GeoJSONSource | undefined

    source?.setData(
      tracks.length === 0
        ? EMPTY_TRACKS_GEOJSON
        : tracksToFeatureCollectionGeoJson(tracks, activeTrack),
    )
    markerSource?.setData(
      activeTrack === null
        ? EMPTY_TRACK_MARKERS_GEOJSON
        : activeTrackToMarkerFeatureCollectionGeoJson(activeTrack),
    )

    if (!fittedInitialBoundsRef.current) {
      const bounds = allTracksBounds(tracks)

      if (bounds !== null) {
        map.fitBounds(bounds, { padding: 64, duration: 0, maxZoom: 16 })
        fittedInitialBoundsRef.current = true
      }
    }
  }, [tracks, activeTrack])

  useEffect(() => {
    const map = mapRef.current

    if (
      map === null ||
      !isMapReadyRef.current ||
      focusedTrack === null
    ) {
      return
    }

    const bounds = trackBounds(focusedTrack.track)

    if (bounds !== null) {
      map.fitBounds(bounds, { padding: 80, duration: 450, maxZoom: 16 })
    }
  }, [focusedTrack])

  return <div className="track-map" ref={containerRef} aria-label="Track map" />
}
