import {
  readGpxText,
  writeTrimmedGpxFromSource,
  type GpxReadResult,
} from '../../formats/gpx/GpxFormat'
import type { Track } from '../../model/Track'
import { TrackOrigin } from '../../model/TrackOrigin'
import type { TrackFormat, TrackSource } from '../../model/TrackSource'

export class LocalFileSource implements TrackSource {
  public readonly providerName = 'local_file'
  private readonly sourceTexts = new Map<string, string>()

  public async readGpxFile(file: File): Promise<GpxReadResult> {
    let text: string

    try {
      text = await file.text()
    } catch {
      throw new Error('File could not be read.')
    }

    const remoteId = this.createRemoteId(file)
    const origin = new TrackOrigin(this, remoteId, file.name, new Date(file.lastModified))

    this.sourceTexts.set(remoteId, text)

    return readGpxText(text, origin)
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

    const gpxText = writeTrimmedGpxFromSource(sourceText, track.pointsCount())

    this.downloadText(gpxText, this.trimmedFileName(origin.name), 'application/gpx+xml;charset=utf-8')
  }

  private createRemoteId(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`
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
