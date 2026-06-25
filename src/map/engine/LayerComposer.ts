import type { StyleSpecification } from 'maplibre-gl'

export class LayerComposer {
  async buildBaseStyle(): Promise<StyleSpecification> { return emptyStyle() }
  async buildOverlayStyle(): Promise<StyleSpecification> { return emptyStyle() }
  applyVisualProfile(style: StyleSpecification): StyleSpecification { return style }
  async compose(): Promise<StyleSpecification> { return emptyStyle() }
}

function emptyStyle(): StyleSpecification {
  return { version: 8, sources: {}, layers: [] }
}
