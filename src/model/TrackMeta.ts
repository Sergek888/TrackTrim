import type { TrackSource } from '../application/sources/TrackSource'

export class TrackMeta {
  public constructor(
    public readonly source: TrackSource,
    public readonly remoteId: string,
    public name: string,
    public color: string,
    public visible: boolean = true,
    public readonly dateTime: Date | null = null,
    public readonly distanceMeters: number | null = null,
  ) {}

  public getOriginalUrl(): string | null {
    return this.source.getOriginalUrl(this)
  }

  public getShareUrl(): string | null {
    return this.source.getShareUrl(this)
  }
}
