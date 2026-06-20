import type { MapProvider } from './MapProvider'

export type MapLink = {
  readonly provider: MapProvider
  readonly label: string
  readonly url: string
}
