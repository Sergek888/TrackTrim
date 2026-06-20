import type { TrackPoint } from '../../model/TrackPoint'
import type { MapLink } from './MapLink'
import type { MapProvider } from './MapProvider'

function buildOpenStreetMapUrl(point: TrackPoint): string {
  return `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=16/${point.lat}/${point.lon}`
}

function buildGoogleMapsUrl(point: TrackPoint): string {
  return `https://www.google.com/maps?q=${point.lat},${point.lon}`
}

function buildAppleMapsUrl(point: TrackPoint): string {
  return `https://maps.apple.com/?ll=${point.lat},${point.lon}&q=${point.lat},${point.lon}`
}

function buildYandexMapsUrl(point: TrackPoint): string {
  return `https://yandex.ru/maps/?ll=${point.lon},${point.lat}&z=16&pt=${point.lon},${point.lat},pm2rdm`
}

function buildUrl(provider: MapProvider, point: TrackPoint): string {
  switch (provider) {
    case 'openStreetMap':
      return buildOpenStreetMapUrl(point)
    case 'googleMaps':
      return buildGoogleMapsUrl(point)
    case 'appleMaps':
      return buildAppleMapsUrl(point)
    case 'yandexMaps':
      return buildYandexMapsUrl(point)
  }
}

function providerLabel(provider: MapProvider): string {
  switch (provider) {
    case 'openStreetMap':
      return 'OpenStreetMap'
    case 'googleMaps':
      return 'Google Maps'
    case 'appleMaps':
      return 'Apple Maps'
    case 'yandexMaps':
      return 'Yandex Maps'
  }
}

export function buildMapLinks(point: TrackPoint, providers: readonly MapProvider[]): MapLink[] {
  return providers.map((provider) => ({
    provider,
    label: providerLabel(provider),
    url: buildUrl(provider, point),
  }))
}
