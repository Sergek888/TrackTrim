import type { Track } from './Track'

export type TrackFormat = 'gpx'

export interface TrackSource {
  readonly providerName: string

  getOriginalUrl(remoteId: string): string | null
  getShareUrl(remoteId: string): string | null
  saveTrack(track: Track, format: TrackFormat): Promise<void>
}
