export type MapBaseStyle = 'osm' | 'openfreemap' | 'topographic' | 'satellite' | 'hybrid'

export type MapLabelMode = 'local' | 'ru' | 'en' | 'dual'

export type MapStyleSettings = {
  baseStyle: MapBaseStyle
  labelMode: MapLabelMode
  showContours: boolean
  showHillshade: boolean
  showTerrain3D: boolean
  satelliteOpacity: number
}

export const DEFAULT_MAP_STYLE_SETTINGS: MapStyleSettings = {
  baseStyle: 'osm',
  labelMode: 'local',
  showContours: false,
  showHillshade: false,
  showTerrain3D: false,
  satelliteOpacity: 100,
}
