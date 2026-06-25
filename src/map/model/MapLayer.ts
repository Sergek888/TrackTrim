export interface MapLayerDefinition {
  id: string
  title: string
  role: string
  sourceType: string
  groupId: string
  order: number
  style: unknown
  attribution: string
  defaultOpacity: number
  visualProfileId?: string
  reliability: string
}
