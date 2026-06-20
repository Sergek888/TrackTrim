import type { Track } from '../model/Track'

export type RawPayload = {
  readonly data: string | ArrayBuffer
  readonly mimeType?: string
}

export interface TrackConverter {
  readonly format: 'gpx'

  deserialize(payload: RawPayload): Track[]
  serialize(track: Track, name: string): RawPayload
}
