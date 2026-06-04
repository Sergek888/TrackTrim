import type { TrackPointInput } from '../model/TrackPoint'

export type RawPayload = {
  readonly data: string | ArrayBuffer
  readonly mimeType?: string
}

export type ParsedGeometry = {
  readonly points: TrackPointInput[]
}

export interface TrackConverter {
  readonly format: 'gpx'

  deserialize(payload: RawPayload): ParsedGeometry
  serialize(points: readonly TrackPointInput[], name: string): RawPayload
}
