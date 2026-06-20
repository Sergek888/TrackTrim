export type GeoPointMenuItemGroup = 'coordinates' | 'map-services'

export type GeoPointMenuItem = {
  readonly id: string
  readonly group: GeoPointMenuItemGroup
  readonly label: string
  readonly icon: 'copy' | 'external-link'
  readonly copyValue?: string
  readonly externalUrl?: string
  readonly disabled?: boolean
  readonly disabledReason?: string
}
