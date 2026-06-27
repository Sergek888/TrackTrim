import type { StyleSpecification } from 'maplibre-gl'

export interface MapStyleCache {
  get(styleUrl: string): StyleSpecification | undefined
  set(styleUrl: string, style: StyleSpecification): void
  has(styleUrl: string): boolean
}
