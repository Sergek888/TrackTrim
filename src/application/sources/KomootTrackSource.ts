import { gpxConverter } from '../../formats/gpx/GpxConverter'
import type { Track } from '../../model/Track'
import { Track as TrackModel } from '../../model/Track'
import { TrackMeta } from '../../model/TrackMeta'
import type { TrackPointInput } from '../../model/TrackPoint'
import {
  KomootApiClient,
  getKomootTargetType,
  parseKomootTarget,
} from '../../komoot/KomootApiClient'
import type {
  KomootApi,
  KomootCoordinate,
  KomootCredentials,
  KomootTarget,
  KomootTourSummary,
  KomootUserListType,
} from '../../komoot/KomootApi'
import { downloadTextFile } from '../download/downloadTextFile'
import type { TrackFormat, TrackLoadCallback, TrackSource } from './TrackSource'

export type { KomootUserListType } from '../../komoot/KomootApi'

export class KomootTrackSource implements TrackSource {
  public visible = true
  public expanded = true
  public order = 0

  private readonly target: KomootTarget
  private readonly komootApi: KomootApi
  private readonly summaries = new WeakMap<TrackMeta, KomootTourSummary>()

  public constructor(
    public readonly url: string,
    public name: string,
    public color: string,
    userListType: KomootUserListType = 'planned',
    credentials: KomootCredentials | null = null,
    komootApi: KomootApi = new KomootApiClient(credentials),
  ) {
    const target = parseKomootTarget(url, userListType)

    if (target === null) {
      throw new Error('Komoot tour, collection, profile URL, or user id is invalid.')
    }

    this.target = target
    this.komootApi = komootApi
  }

  public static canLoadUrl(
    url: string,
    userListType: KomootUserListType = 'planned',
  ): boolean {
    return parseKomootTarget(url, userListType) !== null
  }

  public static getTargetType(url: string): 'tour' | 'collection' | 'user' | null {
    return getKomootTargetType(url)
  }

  public async loadTrackMetas(): Promise<TrackMeta[]> {
    if (this.target.kind === 'user') {
      const sourceName = await this.komootApi.loadUserDisplayName(
        this.target.id,
        this.target.listType,
      )

      if (sourceName !== null) {
        this.name = sourceName
      }
    }

    const summaries = await this.komootApi.loadTrackSummaries(this.target)

    if (summaries.length === 0 && this.target.kind === 'collection') {
      throw new Error('Komoot collection has no public tours or could not be read.')
    }

    return summaries.map((summary) => this.createMetaFromSummary(summary))
  }

  public async loadTrack(meta: TrackMeta): Promise<Track> {
    if (meta.track !== null) {
      return meta.track
    }

    const summary = this.summaries.get(meta) ?? await this.komootApi.loadTourSummary(meta.remoteId)
    const points = await this.komootApi.loadTourCoordinates(summary)

    if (points.length === 0) {
      throw new Error(`Komoot tour ${meta.remoteId} has no public coordinates.`)
    }

    if (summary.name !== null && summary.name.trim() !== '') {
      meta.name = summary.name
    }

    meta.loadStatus = 'ready'
    meta.loadError = null

    const track = new TrackModel(points.map((point) => this.trackPointInput(point)), meta)

    meta.track = track

    return track
  }

  public async loadTracks(onTrackLoaded?: TrackLoadCallback): Promise<Track[]> {
    const metas = await this.loadTrackMetas()
    const tracks: Track[] = []

    for (const meta of metas) {
      const track = await this.loadTrack(meta)

      tracks.push(track)
      onTrackLoaded?.(track)
    }

    return tracks
  }

  public async saveTrack(track: Track, format: TrackFormat): Promise<void> {
    if (format !== 'gpx') {
      throw new Error('Only GPX export is supported.')
    }

    const meta = track.meta
    const payload = gpxConverter.serialize(track.getPoints(), meta?.name ?? 'Komoot tour')

    if (typeof payload.data !== 'string') {
      throw new Error('GPX payload must be text.')
    }

    downloadTextFile(
      payload.data,
      this.trimmedFileName(meta?.name ?? 'komoot-tour'),
      payload.mimeType ?? 'application/gpx+xml;charset=utf-8',
    )
  }

  public getOriginalUrl(meta: TrackMeta): string | null {
    return this.komootApi.getTourOriginalUrl(meta.remoteId)
  }

  public getShareUrl(meta: TrackMeta): string | null {
    return this.komootApi.getTourShareUrl(meta.remoteId)
  }

  private createMetaFromSummary(summary: KomootTourSummary): TrackMeta {
    const hasGeometry = summary.coordinates !== null && summary.coordinates.length > 0
    const meta = new TrackMeta(
      this,
      summary.id,
      summary.name ?? `Komoot tour ${summary.id}`,
      this.color,
      true,
      summary.date,
      summary.distanceMeters,
      hasGeometry ? 'ready' : 'queued',
    )

    this.summaries.set(meta, summary)

    if (hasGeometry) {
      const points = summary.coordinates?.map((point) => this.trackPointInput(point)) ?? []
      const track = new TrackModel(points, meta)

      meta.track = track
    }

    return meta
  }

  private trackPointInput(point: KomootCoordinate): TrackPointInput {
    return {
      lat: point.lat,
      lon: point.lon,
      ele: point.elevation,
      time: point.time,
    }
  }

  private trimmedFileName(name: string): string {
    return name.trim().replace(/[^\w.-]+/g, '-').replace(/-+$/g, '') + '-trimmed.gpx'
  }
}
