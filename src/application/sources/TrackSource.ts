import type { Track } from '../../model/Track'
import type { TrackMeta } from '../../model/TrackMeta'

export type TrackFormat = 'gpx'
export type TrackLoadCallback = (track: Track) => void

export interface TrackSource {
  name: string
  color: string
  visible: boolean
  expanded: boolean
  order: number

  loadTrackMetas(): Promise<TrackMeta[]>
  loadTrack(meta: TrackMeta): Promise<Track>
  loadTracks(onTrackLoaded?: TrackLoadCallback): Promise<Track[]>
  saveTrack(track: Track, format: TrackFormat): Promise<void>
  getOriginalUrl(meta: TrackMeta): string | null
  getShareUrl(meta: TrackMeta): string | null
}
