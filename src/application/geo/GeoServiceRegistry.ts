import type { MapProvider } from './MapProvider'

export type MapServiceConfig = {
  readonly provider: MapProvider
  readonly label: string
  readonly isAvailable?: () => boolean
}

const DEFAULT_SERVICES: MapServiceConfig[] = [
  { provider: 'openStreetMap', label: 'OpenStreetMap' },
  { provider: 'googleMaps', label: 'Google Maps' },
  { provider: 'appleMaps', label: 'Apple Maps' },
  { provider: 'yandexMaps', label: 'Yandex Maps' },
]

let services: MapServiceConfig[] = [...DEFAULT_SERVICES]

export function getMapServices(): readonly MapServiceConfig[] {
  return services
}

export function getAvailableMapProviders(): MapProvider[] {
  return services
    .filter((service) => service.isAvailable === undefined || service.isAvailable())
    .map((service) => service.provider)
}

export function setMapServices(newServices: MapServiceConfig[]): void {
  services = [...newServices]
}
