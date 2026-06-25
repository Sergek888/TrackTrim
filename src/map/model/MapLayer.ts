export interface MapLayerDefinition {
  id: string
  title: string
  role?: string
  kind?: string
  sourceType?: string
  groupId: string
  order: number
  style: any
  attribution: string
  defaultOpacity: number
  visualProfileId?: string
  reliability: string
  requiresApiKey?: boolean
  requiresProxy?: boolean
}
