import { gpxConverter } from '../../formats/gpx/GpxConverter'
import type { Track } from '../../model/Track'
import { Track as TrackModel } from '../../model/Track'
import { TrackMeta } from '../../model/TrackMeta'
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
      const sourceText = await this.readFileText(file)
      const remoteId = this.createRemoteId(file)
      const meta = new TrackMeta(
        this,
        remoteId,
        file.name,
        this.color,
        true,
        new Date(file.lastModified),
      )

      this.sourceTexts.set(remoteId, sourceText)
      const track = this.createTrackFromText(sourceText, meta)

      meta.track = track
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

      this.downloadText(
        payload.data,
        this.trimmedFileName(meta.name),
        payload.mimeType ?? 'application/gpx+xml;charset=utf-8',
      )
      return
    }

    const gpxText = gpxConverter.trimSourceToPointsCount(sourceText, track.pointsCount())

    this.downloadText(
      gpxText,
      this.trimmedFileName(meta.name),
      'application/gpx+xml;charset=utf-8',
    )
  }

  private async readFileText(file: File): Promise<string> {
    try {
      return await file.text()
    } catch {
      throw new Error(`${file.name} could not be read.`)
    }
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

  private trimmedFileName(fileName: string): string {
    return fileName.replace(/\.(gpx|xml)$/i, '') + '-trimmed.gpx'
  }

  private downloadText(text: string, fileName: string, type: string): void {
    const blob = new Blob([text], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = fileName
    link.click()

    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}
