import type { TrackPoint } from '../../model/TrackPoint'
import type { CoordinateFormat } from './CoordinateFormat'
import { formatCoordinate } from './CoordinateFormatter'

export function getCoordinateCopyValue(point: TrackPoint, format: CoordinateFormat): string {
  return formatCoordinate(point, format)
}
