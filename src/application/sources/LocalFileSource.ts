import { gpxConverter } from '../../formats/gpx/GpxConverter'
import type { Track } from '../../model/Track'
import { Track as TrackModel } from '../../model/Track'
import { TrackOrigin } from '../../model/TrackOrigin'
import type {
  SourceConnectionStatus,
  TrackFormat,
  TrackSource,
} from './TrackSource'

export class LocalFileSource implements TrackSource {
  public readonly providerName = 'local_file'
  private readonly sourceTexts = new Map<string, string>()

  public getConnectionStatus(): SourceConnectionStatus {
    return { type: 'connected' }
  }

  public async connect(_credentials: Record<string, unknown>): Promise<void> {}

  public async disconnect(): Promise<void> {}

  public async getTrackList(): Promise<TrackOrigin[]> {
    return []
  }

  public async createOriginFromFile(file: File): Promise<TrackOrigin> {
    let text: string

    try {
      text = await file.text()
    } catch {
      throw new Error('File could not be read.')
    }

    const remoteId = this.createRemoteId(file)
    const origin = new TrackOrigin(this, remoteId, file.name, new Date(file.lastModified))

    this.sourceTexts.set(remoteId, text)

    return origin
  }

  public async loadTrack(origin: TrackOrigin): Promise<Track> {
    const sourceText = this.sourceTexts.get(origin.remoteId) ?? null

    if (sourceText === null) {
      throw new Error('Original GPX source is missing.')
    }

    return this.createTrackFromText(sourceText, origin)
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

    const origin = track.origin

    if (origin === null) {
      throw new Error('Track origin is missing.')
    }

    const sourceText = this.sourceTexts.get(origin.remoteId) ?? null

    if (sourceText === null) {
      throw new Error('Original GPX source is missing.')
    }

    const gpxText = gpxConverter.trimSourceToPointsCount(sourceText, track.pointsCount())

    this.downloadText(
      gpxText,
      this.trimmedFileName(origin.name),
      'application/gpx+xml;charset=utf-8',
    )
  }

  private createRemoteId(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`
  }

  private createTrackFromText(text: string, origin: TrackOrigin): Track {
    const geometry = gpxConverter.deserialize({
      data: text,
      mimeType: 'application/gpx+xml',
    })

    return new TrackModel(geometry.points, origin)
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

export const localFileSource = new LocalFileSource()
