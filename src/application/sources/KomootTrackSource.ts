import type { Track } from '../../model/Track'
import { TrackOrigin } from '../../model/TrackOrigin'
import type {
  LocationScope,
  SourceConnectionStatus,
  TrackFormat,
  TrackSource,
} from './TrackSource'

const KOMOOT_TOUR_URL_PATTERN = /^https?:\/\/(?:www\.)?komoot\.[^/]+\/tour\/(\d+)/i

export class KomootTrackSource implements TrackSource {
  public readonly providerName = 'komoot'

  public getConnectionStatus(): SourceConnectionStatus {
    return { type: 'connected' }
  }

  public async connect(_credentials: Record<string, unknown>): Promise<void> {}

  public async disconnect(): Promise<void> {}

  public async getTrackList(
    _scope?: LocationScope,
    _filter?: Record<string, unknown>,
  ): Promise<TrackOrigin[]> {
    return []
  }

  public createOriginFromUrl(url: string): TrackOrigin | null {
    const remoteId = this.parseTourId(url)

    if (remoteId === null) {
      return null
    }

    return new TrackOrigin(this, remoteId, `Komoot tour ${remoteId}`)
  }

  public async loadTrack(_origin: TrackOrigin): Promise<Track> {
    throw new Error('Komoot track loading is not supported yet.')
  }

  public async saveTrack(_track: Track, _format: TrackFormat): Promise<void> {
    throw new Error('Komoot export is not supported.')
  }

  public getOriginalUrl(remoteId: string): string | null {
    return `https://www.komoot.com/tour/${remoteId}`
  }

  public getShareUrl(remoteId: string): string | null {
    return this.getOriginalUrl(remoteId)
  }

  private parseTourId(url: string): string | null {
    const match = url.trim().match(KOMOOT_TOUR_URL_PATTERN)

    return match?.[1] ?? null
  }
}

export const komootTrackSource = new KomootTrackSource()
