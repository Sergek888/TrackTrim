import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import maplibregl, { type GeoJSONSource } from 'maplibre-gl'
import type { Track } from '../../model/Track'
import type { MapStyleSettings } from './mapStyleSettings'
import MapStyleControl from './MapStyleControl'
import {
  activeTrackToMarkerFeatureCollectionGeoJson,
  tracksToFeatureCollectionGeoJson,
  type TrackMarkersFeatureCollectionGeoJson,
  type TracksFeatureCollectionGeoJson,
} from '../../formats/geojson/trackToGeoJson'
import { allTracksBounds, trackBounds } from './mapBounds'
import { applyMapStyleSettings, createInitialMapStyle } from './mapStyle'
import { createMapStyleButton, createTrackMarkerImage } from './mapIcons'
import { queryTrackFeatures, resetInteractiveCursor, setInteractiveCursor } from './mapHitTest'
import {
  ACTIVE_TRACKS_LAYER_ID,
  TRACK_FINISH_IMAGE_ID,
  TRACK_MARKERS_LAYER_ID,
  TRACK_MARKERS_SOURCE_ID,
  TRACK_START_IMAGE_ID,
  TRACKS_LAYER_ID,
  TRACKS_SOURCE_ID,
} from './mapLayerIds'
import './map.css'

type ExtraButton = {
  icon: ReactNode
  label: string
  title: string
  onClick: () => void
}

type TrackMapProps = {
  tracks: readonly Track[]
  activeTrack: Track | null
  focusedTrack: {
    track: Track
    version: number
  } | null
  mapStyleSettings: MapStyleSettings
  onMapStyleSettingsChange: (settings: MapStyleSettings) => void
  onTrackClick: (track: Track, point: TrackMapPoint) => void
  onMapClick: () => void
  extraButtons?: readonly ExtraButton[]
}

export type TrackMapPoint = {
  latitude: number
  longitude: number
  x: number
  y: number
}

const EMPTY_TRACKS_GEOJSON: TracksFeatureCollectionGeoJson = {
  type: 'FeatureCollection',
  features: [],
}
const EMPTY_TRACK_MARKERS_GEOJSON: TrackMarkersFeatureCollectionGeoJson = {
  type: 'FeatureCollection',
  features: [],
}

export default function TrackMap({
  tracks,
  activeTrack,
  focusedTrack,
  mapStyleSettings,
  onMapStyleSettingsChange,
  onTrackClick,
  onMapClick,
  extraButtons,
}: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mapStyleButtonRef = useRef<HTMLButtonElement | null>(null)
  const extraButtonsRef = useRef<HTMLButtonElement[]>([])
  const extraButtonsRootsRef = useRef<ReturnType<typeof createRoot>[]>([])
  const [isMapStylePanelOpen, setIsMapStylePanelOpen] = useState(false)
  const latestTracksRef = useRef(tracks)
  const latestActiveTrackRef = useRef(activeTrack)
  const latestOnTrackClickRef = useRef(onTrackClick)
  const latestOnMapClickRef = useRef(onMapClick)
  const latestMapStyleSettingsRef = useRef(mapStyleSettings)
  const fittedInitialBoundsRef = useRef(false)
  const isMapReadyRef = useRef(false)

  latestTracksRef.current = tracks
  latestActiveTrackRef.current = activeTrack
  latestOnTrackClickRef.current = onTrackClick
  latestOnMapClickRef.current = onMapClick
  latestMapStyleSettingsRef.current = mapStyleSettings

  useEffect(() => {
    if (containerRef.current === null || mapRef.current !== null) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createInitialMapStyle(latestMapStyleSettingsRef.current.labelMode),
      center: [0, 0],
      zoom: 1,
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    const navigationControlGroup = containerRef.current.querySelector<HTMLElement>(
      '.maplibregl-ctrl-top-right .maplibregl-ctrl-group',
    )
    const handleMapStyleClick = () => {
      setIsMapStylePanelOpen((open) => !open)
    }

    if (navigationControlGroup !== null && navigationControlGroup !== undefined) {
      const mapStyleButton = createMapStyleButton(handleMapStyleClick)
      navigationControlGroup.append(mapStyleButton)
      mapStyleButtonRef.current = mapStyleButton

      const buttons: HTMLButtonElement[] = []
      for (const cfg of (extraButtons ?? [])) {
        const btn = document.createElement('button')
        btn.className = 'maplibregl-ctrl-icon map-extra-toggle'
        btn.type = 'button'
        btn.setAttribute('aria-label', cfg.label)
        btn.setAttribute('title', cfg.title)
        btn.onclick = cfg.onClick
        navigationControlGroup.append(btn)
        buttons.push(btn)
      }
      extraButtonsRef.current = buttons
    }

    map.on('load', () => {
      isMapReadyRef.current = true
      applyMapStyleSettings(map, latestMapStyleSettingsRef.current)

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
        const features = queryTrackFeatures(map, event.point)

        if (features.length > 0) {
          setInteractiveCursor(map)
          return
        }

        resetInteractiveCursor(map)
      })
      map.on('click', (event) => {
        const features = queryTrackFeatures(map, event.point)
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
      mapStyleButtonRef.current?.removeEventListener(
        'click',
        handleMapStyleClick,
      )
      mapStyleButtonRef.current?.remove()
      mapStyleButtonRef.current = null
      for (const root of extraButtonsRootsRef.current) root.unmount()
      extraButtonsRootsRef.current = []
      for (const btn of extraButtonsRef.current) btn.onclick = null
      for (const btn of extraButtonsRef.current) btn.remove()
      extraButtonsRef.current = []
      map.remove()
      mapRef.current = null
      fittedInitialBoundsRef.current = false
      isMapReadyRef.current = false
    }
  }, [])

  useEffect(() => {
    mapStyleButtonRef.current?.setAttribute(
      'aria-expanded',
      String(isMapStylePanelOpen),
    )
  }, [isMapStylePanelOpen])

  useEffect(() => {
    const map = mapRef.current

    if (map === null || !isMapReadyRef.current) {
      return
    }

    applyMapStyleSettings(map, mapStyleSettings)
  }, [mapStyleSettings])

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

  useEffect(() => {
    const buttons = extraButtonsRef.current
    const configs = extraButtons ?? []

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i]
      const cfg = configs[i]
      if (btn === undefined || cfg === undefined) continue

      btn.setAttribute('aria-label', cfg.label)
      btn.setAttribute('title', cfg.title)
      btn.onclick = cfg.onClick

      let root = extraButtonsRootsRef.current[i]
      if (root === undefined) {
        root = createRoot(btn)
        extraButtonsRootsRef.current[i] = root
      }
      root.render(cfg.icon)
    }
  }, [extraButtons])

  return (
    <>
      <div className="track-map" ref={containerRef} aria-label="Track map" />
      <MapStyleControl
        isOpen={isMapStylePanelOpen}
        settings={mapStyleSettings}
        onChange={onMapStyleSettingsChange}
      />
    </>
  )
}
