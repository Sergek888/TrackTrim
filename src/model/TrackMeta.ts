import type { TrackSource } from '../application/sources/TrackSource'
import type { Track } from './Track'

export type TrackLoadStatus = 'queued' | 'loading' | 'ready' | 'error'

export class TrackMeta {
  public track: Track | null = null
  public loadStatus: TrackLoadStatus = 'ready'
  public loadError: string | null = null

  public constructor(
    public readonly source: TrackSource,
    public readonly remoteId: string,
    public name: string,
    public color: string,
    public visible: boolean = true,
    public readonly dateTime: Date | null = null,
    public readonly distanceMeters: number | null = null,
    loadStatus: TrackLoadStatus = 'ready',
  ) {
    this.loadStatus = loadStatus
  }

  public getOriginalUrl(): string | null {
    return this.source.getOriginalUrl(this)
  }

  public getShareUrl(): string | null {
    return this.source.getShareUrl(this)
  }
}
