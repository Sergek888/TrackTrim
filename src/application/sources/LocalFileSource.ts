import { gpxConverter } from '../../formats/gpx/GpxConverter'
import type { Track } from '../../model/Track'
import { Track as TrackModel } from '../../model/Track'
import { TrackMeta } from '../../model/TrackMeta'
import { downloadTextFile } from '../download/downloadTextFile'
import { readTextFile } from '../files/readTextFile'
import type { TrackFormat, TrackLoadCallback, TrackSource } from './TrackSource'

export class LocalFileTrackSource implements TrackSource {
  public visible = true
  public expanded = true
  public order = 0

  private readonly sourceTexts = new Map<string, string>()

  public constructor(
    private readonly files: readonly File[],
    public name: string,
    public color: string,
  ) {}

  public async loadTrackMetas(): Promise<TrackMeta[]> {
    const metas: TrackMeta[] = []

    for (const file of this.files) {
      const sourceText = await readTextFile(file)
      const remoteId = this.createRemoteId(file)
      const meta = new TrackMeta(
        this,
        remoteId,
        file.name,
        this.color,
        { sourceUpdatedAt: new Date(file.lastModified) },
      )

      this.sourceTexts.set(remoteId, sourceText)
      const track = this.createTrackFromText(sourceText, meta)

      meta.track = track
      meta.fillMissingCalculated(track)
      metas.push(meta)
    }

    return metas
  }

  public async loadTrack(meta: TrackMeta): Promise<Track> {
    if (meta.track !== null) {
      return meta.track
    }

    const sourceText = this.sourceTexts.get(meta.remoteId) ?? null

    if (sourceText === null) {
      throw new Error(`${meta.name} could not be read.`)
    }

    const track = this.createTrackFromText(sourceText, meta)

    meta.track = track
    meta.loadStatus = 'ready'
    meta.fillMissingCalculated(track)

    return track
  }

  public async loadTracks(onTrackLoaded?: TrackLoadCallback): Promise<Track[]> {
    const metas = await this.loadTrackMetas()
    const tracks = metas
      .map((meta) => meta.track)
      .filter((track): track is Track => track !== null)

    for (const track of tracks) {
      onTrackLoaded?.(track)
    }

    return tracks
  }

  public getOriginalUrl(): string | null {
    return null
  }

  public getShareUrl(): string | null {
    return null
  }

  public async saveTrack(track: Track, format: TrackFormat): Promise<void> {
    if (format !== 'gpx') {
      throw new Error('Only GPX export is supported.')
    }

    const meta = track.meta

    if (meta === null) {
      throw new Error('Track metadata is missing.')
    }

    const sourceText = this.sourceTexts.get(meta.remoteId) ?? null

    if (sourceText === null) {
      const payload = gpxConverter.serialize(track.getPoints(), meta.name)

      if (typeof payload.data !== 'string') {
        throw new Error('GPX payload must be text.')
      }

      downloadTextFile(
        payload.data,
        this.gpxFileName(meta.name),
        payload.mimeType ?? 'application/gpx+xml;charset=utf-8',
      )
      return
    }

    const gpxText = gpxConverter.trimSourceToPointsCount(sourceText, track.pointsCount())

    downloadTextFile(
      gpxText,
      this.gpxFileName(meta.name),
      'application/gpx+xml;charset=utf-8',
    )
  }

  private createRemoteId(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`
  }

  private createTrackFromText(text: string, meta: TrackMeta): Track {
    const geometry = gpxConverter.deserialize({
      data: text,
      mimeType: 'application/gpx+xml',
    })

    return new TrackModel(geometry.points, meta)
  }

  private gpxFileName(fileName: string): string {
    const baseName = fileName.trim().replace(/\.(gpx|xml)$/i, '').replace(/[<>:"/\\|?*]+/g, '-')

    return `${baseName || 'track'}.gpx`
  }
}
