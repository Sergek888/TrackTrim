import { gpxConverter } from '../../formats/gpx/GpxConverter'
import { BaseModel } from '../../model/base/BaseModel'
import type { Track } from '../../model/Track'
import { Track as TrackModel } from '../../model/Track'
import { TrackMeta } from '../../model/TrackMeta'
import { downloadTextFile } from '../download/downloadTextFile'
import {
  getLocalFileSystem,
  type LocalFilePathKind,
} from '../files/localFileSystem'
import type { TrackFormat, TrackLoadCallback, TrackSource } from './TrackSource'

export type LocalFileTrackSourceOptions = {
  readonly path: string
  readonly pathKind: LocalFilePathKind
  readonly name: string
  readonly color: string
  readonly visible?: boolean
  readonly expanded?: boolean
  readonly order?: number
}

export class LocalFileTrackSource extends BaseModel implements TrackSource {
  public static modelType = 'local-file-track-source'

  public visible = true
  public expanded = true
  public order = 0
  public path = ''
  public pathKind: LocalFilePathKind = 'file'
  public name = ''
  public color = '#2563eb'

  private sourceTexts = new Map<string, string>()

  public constructor(options?: LocalFileTrackSourceOptions) {
    super()

    if (options === undefined) {
      return
    }

    this.path = options.path
    this.pathKind = options.pathKind
    this.name = options.name
    this.color = options.color
    this.visible = options.visible ?? true
    this.expanded = options.expanded ?? true
    this.order = options.order ?? 0
  }

  public async loadTrackMetas(): Promise<TrackMeta[]> {
    const metas: TrackMeta[] = []
    const entries = await getLocalFileSystem().read(this.path, this.pathKind)

    for (const entry of entries) {
      const sourceText = await entry.readText()
      const remoteId = entry.path
      const meta = new TrackMeta(
        this,
        remoteId,
        entry.name,
        this.color,
        { sourceUpdatedAt: entry.lastModified },
      )

      this.sourceTexts.set(remoteId, sourceText)
      const track = this.createTrackFromText(sourceText)

      meta.track = track
      meta.fillMissingFromPoints(track.getPoints())
      metas.push(meta)
    }

    return metas
  }

  public async loadTrack(meta: TrackMeta): Promise<Track> {
    if (meta.track !== null) {
      return meta.track
    }

    const sourceText = this.sourceTexts.get(meta.remoteId) ?? await this.readSourceText(meta.remoteId)

    if (sourceText === null) {
      throw new Error(`${meta.name} could not be read.`)
    }

    const track = this.createTrackFromText(sourceText)

    meta.track = track
    meta.loadStatus = 'ready'
    meta.fillMissingFromPoints(track.getPoints())

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

  public async saveTrack(meta: TrackMeta, format: TrackFormat): Promise<void> {
    if (format !== 'gpx') {
      throw new Error('Only GPX export is supported.')
    }

    if (meta.track === null) {
      throw new Error('Track is not loaded.')
    }

    const payload = gpxConverter.serialize(meta.track, meta.name)

    if (typeof payload.data !== 'string') {
      throw new Error('GPX payload must be text.')
    }

    downloadTextFile(
      payload.data,
      this.gpxFileName(meta.name),
      payload.mimeType ?? 'application/gpx+xml;charset=utf-8',
    )
  }

  public override serialize(): Record<string, unknown> {
    return {
      path: this.path,
      pathKind: this.pathKind,
      name: this.name,
      color: this.color,
      visible: this.visible,
      expanded: this.expanded,
      order: this.order,
    }
  }

  public override modelKey(): string | null {
    return this.path.trim() === '' ? null : `${this.pathKind}:${this.path}`
  }

  public override deserializeFields(fields: Record<string, unknown>): void {
    this.path = String(fields.path ?? '')
    this.pathKind = fields.pathKind === 'file' ? 'file' : 'directory'
    this.name = String(fields.name ?? '')
    this.color = String(fields.color ?? '#2563eb')
    this.visible = fields.visible !== false
    this.expanded = fields.expanded !== false
    this.order = typeof fields.order === 'number' ? fields.order : 0
    this.sourceTexts = new Map<string, string>()
  }

  public override afterDeserialize(): void {
    this.sourceTexts = new Map<string, string>()
  }

  protected override runtimeFields(): readonly string[] {
    return ['sourceTexts']
  }

  private async readSourceText(remoteId: string): Promise<string | null> {
    const entries = await getLocalFileSystem().read(this.path, this.pathKind)
    const entry = entries.find((candidate) => candidate.path === remoteId) ?? null

    if (entry === null) {
      return null
    }

    const sourceText = await entry.readText()
    this.sourceTexts.set(remoteId, sourceText)

    return sourceText
  }

  private createTrackFromText(text: string): Track {
    const tracks = gpxConverter.deserialize({
      data: text,
      mimeType: 'application/gpx+xml',
    })

    const track = tracks[0] ?? TrackModel.fromPoints([])

    return new TrackModel([...track.getSegments()], [...track.getViewPoints()])
  }

  private gpxFileName(fileName: string): string {
    const baseName = fileName.trim().replace(/\.(gpx|xml)$/i, '').replace(/[<>:"/\\|?*]+/g, '-')

    return `${baseName || 'track'}.gpx`
  }
}
