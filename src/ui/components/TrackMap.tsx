import { useEffect, useRef, useState } from 'react'
import maplibregl, {
  type ExpressionSpecification,
  type GeoJSONSource,
  type LngLatBoundsLike,
} from 'maplibre-gl'
import mlcontour from 'maplibre-contour'
import type { Track } from '../../model/Track'
import type {
  MapLabelMode,
  MapStyleSettings,
} from '../map/mapStyleSettings'
import MapStyleControl from './MapStyleControl'
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
  mapStyleSettings: MapStyleSettings
  onMapStyleSettingsChange: (settings: MapStyleSettings) => void
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
const OSM_LAYER_ID = 'osm'
const TOPOGRAPHIC_LAYER_ID = 'topographic'
const SATELLITE_LAYER_ID = 'satellite'
const HILLSHADE_LAYER_ID = 'hillshade'
const MAP_LABELS_LAYER_ID = 'map-labels'
const CONTOURS_LAYER_ID = 'contours'
const INTERACTIVE_TRACK_LAYER_IDS = [ACTIVE_TRACKS_LAYER_ID, TRACKS_LAYER_ID]
const TRACK_HIT_TOLERANCE = 5
const TRACK_MARKER_SIZE = 20
const EMPTY_TRACKS_GEOJSON: TracksFeatureCollectionGeoJson = {
  type: 'FeatureCollection',
  features: [],
}
const EMPTY_TRACK_MARKERS_GEOJSON: TrackMarkersFeatureCollectionGeoJson = {
  type: 'FeatureCollection',
  features: [],
}
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const contourDemSource = new mlcontour.DemSource({
  url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  encoding: 'terrarium',
  maxzoom: 12,
  worker: false,
})

contourDemSource.setupMaplibre(maplibregl)

function createLayersIcon(): SVGSVGElement {
  const icon = document.createElementNS(SVG_NAMESPACE, 'svg')

  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('fill', 'none')
  icon.setAttribute('stroke', 'currentColor')
  icon.setAttribute('stroke-linecap', 'round')
  icon.setAttribute('stroke-linejoin', 'round')
  icon.setAttribute('viewBox', '0 0 24 24')

  for (const pathData of [
    'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z',
    'm22 12.5-9.17 4.17a2 2 0 0 1-1.66 0L2 12.5',
    'm22 17.5-9.17 4.17a2 2 0 0 1-1.66 0L2 17.5',
  ]) {
    const path = document.createElementNS(SVG_NAMESPACE, 'path')
    path.setAttribute('d', pathData)
    icon.append(path)
  }

  return icon
}

function createMapStyleButton(onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button')

  button.className = 'maplibregl-ctrl-icon map-style-toggle'
  button.type = 'button'
  button.title = 'Стили карты'
  button.setAttribute('aria-label', 'Стили карты')
  button.setAttribute('aria-controls', 'map-style-panel')
  button.setAttribute('aria-expanded', 'false')
  button.append(createLayersIcon())
  button.addEventListener('click', onClick)

  return button
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

function queryTrackFeatures(map: maplibregl.Map, point: maplibregl.Point) {
  const directFeatures = map.queryRenderedFeatures(point, {
    layers: INTERACTIVE_TRACK_LAYER_IDS,
  })

  if (directFeatures.length > 0) {
    return directFeatures
  }

  return map.queryRenderedFeatures(
    [
      [point.x - TRACK_HIT_TOLERANCE, point.y - TRACK_HIT_TOLERANCE],
      [point.x + TRACK_HIT_TOLERANCE, point.y + TRACK_HIT_TOLERANCE],
    ],
    {
      layers: INTERACTIVE_TRACK_LAYER_IDS,
    },
  )
}

function setLayerVisibility(
  map: maplibregl.Map,
  layerId: string,
  visible: boolean,
): void {
  if (map.getLayer(layerId) !== undefined) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
  }
}

function mapLabelTextField(labelMode: MapLabelMode): ExpressionSpecification {
  const localName: ExpressionSpecification = ['coalesce', ['get', 'name'], '']
  const russianName: ExpressionSpecification = [
    'coalesce',
    ['get', 'name:ru'],
    ['get', 'name_ru'],
    localName,
  ]
  const englishName: ExpressionSpecification = [
    'coalesce',
    ['get', 'name:en'],
    ['get', 'name_en'],
    ['get', 'name:latin'],
    localName,
  ]

  if (labelMode === 'ru') {
    return russianName
  }

  if (labelMode === 'en') {
    return englishName
  }

  if (labelMode === 'dual') {
    return [
      'case',
      ['==', localName, englishName],
      localName,
      ['concat', localName, '\n', englishName],
    ]
  }

  return localName
}

export function applyMapStyleSettings(
  map: maplibregl.Map,
  settings: MapStyleSettings,
): void {
  const satelliteVisible =
    settings.baseStyle === 'satellite' || settings.baseStyle === 'hybrid'

  setLayerVisibility(map, OSM_LAYER_ID, settings.baseStyle === 'osm')
  setLayerVisibility(
    map,
    TOPOGRAPHIC_LAYER_ID,
    settings.baseStyle === 'topographic',
  )
  setLayerVisibility(map, SATELLITE_LAYER_ID, satelliteVisible)
  setLayerVisibility(
    map,
    MAP_LABELS_LAYER_ID,
    settings.baseStyle === 'hybrid',
  )
  setLayerVisibility(map, CONTOURS_LAYER_ID, settings.showContours)
  setLayerVisibility(map, HILLSHADE_LAYER_ID, settings.showHillshade)

  if (map.getLayer(MAP_LABELS_LAYER_ID) !== undefined) {
    map.setLayoutProperty(
      MAP_LABELS_LAYER_ID,
      'text-field',
      mapLabelTextField(settings.labelMode),
    )
  }

  if (map.getLayer(SATELLITE_LAYER_ID) !== undefined) {
    map.setPaintProperty(
      SATELLITE_LAYER_ID,
      'raster-opacity',
      settings.satelliteOpacity / 100,
    )
  }
}

export default function TrackMap({
  tracks,
  activeTrack,
  focusedTrack,
  mapStyleSettings,
  onMapStyleSettingsChange,
  onTrackClick,
  onMapClick,
}: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mapStyleButtonRef = useRef<HTMLButtonElement | null>(null)
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
      style: {
        version: 8,
        glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
          topographic: {
            type: 'raster',
            tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 17,
            attribution: '© OpenStreetMap contributors, SRTM | OpenTopoMap',
          },
          satellite: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri World Imagery',
          },
          hillshade: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri World Hillshade',
          },
          mapLabels: {
            type: 'vector',
            url: 'https://tiles.openfreemap.org/planet',
            attribution: '© OpenStreetMap contributors | OpenFreeMap',
          },
          contours: {
            type: 'vector',
            tiles: [
              contourDemSource.contourProtocolUrl({
                thresholds: {
                  9: [500, 2500],
                  11: [200, 1000],
                  13: [100, 500],
                  15: [50, 250],
                },
              }),
            ],
            maxzoom: 15,
          },
        },
        layers: [
          {
            id: OSM_LAYER_ID,
            type: 'raster',
            source: 'osm',
          },
          {
            id: TOPOGRAPHIC_LAYER_ID,
            type: 'raster',
            source: 'topographic',
            layout: {
              visibility: 'none',
            },
          },
          {
            id: SATELLITE_LAYER_ID,
            type: 'raster',
            source: 'satellite',
            layout: {
              visibility: 'none',
            },
          },
          {
            id: HILLSHADE_LAYER_ID,
            type: 'raster',
            source: 'hillshade',
            layout: {
              visibility: 'none',
            },
            paint: {
              'raster-opacity': 0.35,
            },
          },
          {
            id: CONTOURS_LAYER_ID,
            type: 'line',
            source: 'contours',
            'source-layer': 'contours',
            layout: {
              visibility: 'none',
            },
            paint: {
              'line-color': 'rgba(71, 85, 105, 0.72)',
              'line-width': ['match', ['get', 'level'], 1, 1.15, 0.55],
            },
          },
          {
            id: MAP_LABELS_LAYER_ID,
            type: 'symbol',
            source: 'mapLabels',
            'source-layer': 'place',
            minzoom: 2,
            layout: {
              visibility: 'none',
              'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
              'text-field': mapLabelTextField(
                latestMapStyleSettingsRef.current.labelMode,
              ),
              'text-font': ['Noto Sans Regular'],
              'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                2,
                10,
                8,
                13,
                14,
                15,
              ],
              'text-max-width': 9,
              'text-padding': 3,
            },
            paint: {
              'text-color': '#1f2937',
              'text-halo-color': 'rgba(255, 255, 255, 0.92)',
              'text-halo-width': 1.5,
            },
          },
        ],
      },
      center: [0, 0],
      zoom: 1,
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-left')
    const navigationControlGroup = containerRef.current.querySelector<HTMLElement>(
      '.maplibregl-ctrl-top-left .maplibregl-ctrl-group',
    )
    const handleMapStyleClick = () => {
      setIsMapStylePanelOpen((open) => !open)
    }

    if (navigationControlGroup !== null) {
      const mapStyleButton = createMapStyleButton(handleMapStyleClick)
      navigationControlGroup.append(mapStyleButton)
      mapStyleButtonRef.current = mapStyleButton
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
