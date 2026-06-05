import type { Track } from '../../model/Track'
import type { TrackMeta } from '../../model/TrackMeta'

export type TrackFormat = 'gpx'

export interface TrackSource {
  name: string
  color: string
  visible: boolean
  expanded: boolean
  order: number

  loadTracks(): Promise<Track[]>
  saveTrack(track: Track, format: TrackFormat): Promise<void>
  getOriginalUrl(meta: TrackMeta): string | null
  getShareUrl(meta: TrackMeta): string | null
}
