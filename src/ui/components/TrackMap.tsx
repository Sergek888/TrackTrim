import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike } from 'maplibre-gl'
import type { Track } from '../../model/Track'
import { trackToLineGeoJson } from '../map/trackToGeoJson'

type TrackMapProps = {
  track: Track
  boundsTrack: Track
}

const TRACK_SOURCE_ID = 'track'
const TRACK_LAYER_ID = 'track-line'

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

export default function TrackMap({ track, boundsTrack }: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const fittedBoundsTrackRef = useRef<Track | null>(null)
  const latestTrackRef = useRef(track)
  const latestBoundsTrackRef = useRef(boundsTrack)

  latestTrackRef.current = track
  latestBoundsTrackRef.current = boundsTrack

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
      map.addSource(TRACK_SOURCE_ID, {
        type: 'geojson',
        data: trackToLineGeoJson(latestTrackRef.current),
      })
      map.addLayer({
        id: TRACK_LAYER_ID,
        type: 'line',
        source: TRACK_SOURCE_ID,
        paint: {
          'line-color': '#0f766e',
          'line-width': 4,
          'line-opacity': 0.9,
        },
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
      fittedBoundsTrackRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current

    if (map === null || !map.isStyleLoaded()) {
      return
    }

    const source = map.getSource(TRACK_SOURCE_ID) as GeoJSONSource | undefined

    source?.setData(trackToLineGeoJson(track))
  }, [track])

  useEffect(() => {
    const map = mapRef.current

    if (map === null || !map.isStyleLoaded() || fittedBoundsTrackRef.current === boundsTrack) {
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
