import type { Track } from '../../model/Track'
import type { TrackOrigin } from '../../model/TrackOrigin'

export type SourceConnectionStatus =
  | { readonly type: 'unauthorized' }
  | { readonly type: 'connecting' }
  | { readonly type: 'connected' }
  | { readonly type: 'error'; readonly message: string }

export type LocationScope =
  | { readonly type: 'all' }
  | { readonly type: 'collection'; readonly collectionId: string }
  | { readonly type: 'folder'; readonly folderPath: string }

export type TrackFormat = 'gpx'

export interface TrackSource {
  readonly providerName: string

  getConnectionStatus(): SourceConnectionStatus
  connect(credentials: Record<string, unknown>): Promise<void>
  disconnect(): Promise<void>
  getTrackList(scope?: LocationScope, filter?: Record<string, unknown>): Promise<TrackOrigin[]>
  loadTrack(origin: TrackOrigin): Promise<Track>
  saveTrack(track: Track, format: TrackFormat): Promise<void>
  getOriginalUrl(remoteId: string): string | null
  getShareUrl(remoteId: string): string | null
}
