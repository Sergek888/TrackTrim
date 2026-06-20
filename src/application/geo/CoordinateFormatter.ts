import type { TrackPoint } from '../../model/TrackPoint'
import type { CoordinateFormat } from './CoordinateFormat'

function toDms(value: number, isLat: boolean): string {
  const absolute = Math.abs(value)
  const degrees = Math.floor(absolute)
  const minutesFloat = (absolute - degrees) * 60
  const minutes = Math.floor(minutesFloat)
  const seconds = Math.round((minutesFloat - minutes) * 60)

  const direction = isLat
    ? value >= 0 ? 'N' : 'S'
    : value >= 0 ? 'E' : 'W'

  return `${degrees}°${minutes}'${seconds}"${direction}`
}

function formatDecimal(point: TrackPoint): string {
  return `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`
}

function formatDms(point: TrackPoint): string {
  return `${toDms(point.lat, true)} ${toDms(point.lon, false)}`
}

function formatGeoUri(point: TrackPoint): string {
  return `geo:${point.lat},${point.lon}`
}

export function formatCoordinate(point: TrackPoint, format: CoordinateFormat): string {
  switch (format) {
    case 'decimal':
      return formatDecimal(point)
    case 'dms':
      return formatDms(point)
    case 'geoUri':
      return formatGeoUri(point)
  }
}

export function coordinateFormatLabel(format: CoordinateFormat): string {
  switch (format) {
    case 'decimal':
      return 'Decimal'
    case 'dms':
      return 'DMS'
    case 'geoUri':
      return 'Geo URI'
  }
}
