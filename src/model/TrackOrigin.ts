import type { TrackSource } from '../application/sources/TrackSource'

export class TrackOrigin {
  public constructor(
    public readonly source: TrackSource,
    public readonly remoteId: string,
    public readonly name: string,
    public readonly dateTime: Date | null = null,
    public readonly distanceMeters: number | null = null,
  ) {}

  public getOriginalUrl(): string | null {
    return this.source.getOriginalUrl(this.remoteId)
  }

  public getShareUrl(): string | null {
    return this.source.getShareUrl(this.remoteId)
  }
}
