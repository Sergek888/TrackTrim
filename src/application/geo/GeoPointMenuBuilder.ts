import type { TrackPoint } from '../../model/TrackPoint'
import type { CoordinateFormat } from './CoordinateFormat'
import { COORDINATE_FORMATS } from './CoordinateFormat'
import { formatCoordinate } from './CoordinateFormatter'
import type { GeoPointMenuItem } from './GeoPointMenuItem'
import { getAvailableMapProviders } from './GeoServiceRegistry'
import { buildMapLinks } from './MapLinkBuilder'

function createCoordinateItems(point: TrackPoint): GeoPointMenuItem[] {
  return COORDINATE_FORMATS.map((format: CoordinateFormat) => ({
    id: `coord-${format}`,
    group: 'coordinates' as const,
    label: formatCoordinate(point, format),
    icon: 'copy' as const,
    copyValue: formatCoordinate(point, format),
  }))
}

function createMapServiceItems(point: TrackPoint): GeoPointMenuItem[] {
  const providers = getAvailableMapProviders()
  const links = buildMapLinks(point, providers)

  return links.map((link) => ({
    id: `map-${link.provider}`,
    group: 'map-services' as const,
    label: link.label,
    icon: 'external-link' as const,
    copyValue: link.url,
    externalUrl: link.url,
  }))
}

export function buildGeoPointMenuItems(point: TrackPoint): GeoPointMenuItem[] {
  const geoUri = formatCoordinate(point, 'geoUri')

  return [
    ...createCoordinateItems(point),
    {
      id: 'coord-geoUri',
      group: 'coordinates',
      label: geoUri,
      icon: 'external-link',
      externalUrl: geoUri,
    },
    ...createMapServiceItems(point),
  ]
}
