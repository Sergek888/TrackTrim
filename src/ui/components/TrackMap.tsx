import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike } from 'maplibre-gl'
import type { Track } from '../../model/Track'
import {
  tracksToMarkerFeatureCollectionGeoJson,
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
const TRACK_MARKER_CIRCLES_LAYER_ID = 'track-marker-circles'
const TRACK_MARKER_LABELS_LAYER_ID = 'track-marker-labels'
const INTERACTIVE_TRACK_LAYER_IDS = [ACTIVE_TRACKS_LAYER_ID, TRACKS_LAYER_ID]
const EMPTY_TRACKS_GEOJSON: TracksFeatureCollectionGeoJson = {
  type: 'FeatureCollection',
  features: [],
}
const EMPTY_TRACK_MARKERS_GEOJSON: TrackMarkersFeatureCollectionGeoJson = {
  type: 'FeatureCollection',
  features: [],
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
        data:
          latestTracksRef.current.length === 0
            ? EMPTY_TRACK_MARKERS_GEOJSON
            : tracksToMarkerFeatureCollectionGeoJson(latestTracksRef.current),
      })
      map.addLayer({
        id: TRACK_MARKER_CIRCLES_LAYER_ID,
        type: 'circle',
        source: TRACK_MARKERS_SOURCE_ID,
        minzoom: 8,
        paint: {
          'circle-color': ['case', ['==', ['get', 'kind'], 'start'], '#16a34a', '#dc2626'],
          'circle-radius': 9,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
      map.addLayer({
        id: TRACK_MARKER_LABELS_LAYER_ID,
        type: 'symbol',
        source: TRACK_MARKERS_SOURCE_ID,
        minzoom: 8,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-font': ['Open Sans Bold'],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
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
      tracks.length === 0
        ? EMPTY_TRACK_MARKERS_GEOJSON
        : tracksToMarkerFeatureCollectionGeoJson(tracks),
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
