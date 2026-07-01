import { XMLParser } from 'fast-xml-parser'
import type { TrackConverter, RawPayload } from '../TrackConverter'
import { Track } from '../../model/Track'
import { TrackSegment } from '../../model/TrackSegment'
import type { TrackPoint, TrackPointExtensions } from '../../model/TrackPoint'
import type { ViewPoint } from '../../model/ViewPoint'
import type { TrackMetaOptions } from '../../model/TrackMeta'
import type {
  GpxRoot,
  GpxTrack,
  GpxRoute,
  GpxTrackPoint,
  GpxWaypoint,
  GpxTrackSegment,
  GpxTrackPointExtensions,
} from './gpxTypes'

function normalizeToArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string') {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function parseTrackPoint(raw: GpxTrackPoint): TrackPoint | null {
  const lat = parseNumber(raw.lat)
  const lon = parseNumber(raw.lon)

  if (lat === null || lon === null) {
    return null
  }

  return {
    lat,
    lon,
    ele: parseNumber(raw.ele),
    time: parseDate(raw.time),
    extensions: parseExtensions(raw.extensions),
  }
}

function parseExtensions(raw: Record<string, unknown> | undefined): TrackPointExtensions | undefined {
  if (raw === undefined) {
    return undefined
  }

  const ext = raw as GpxTrackPointExtensions
  const tpx = ext['TrackPointExtension'] ?? ext['gpxtpx:TrackPointExtension']
  const extensions: TrackPointExtensions = {}

  if (tpx !== undefined) {
    const tpxRecord = tpx as Record<string, unknown>
    const hr = parseNumber(tpxRecord['hr'] ?? tpxRecord['gpxtpx:hr'])
    const cad = parseNumber(tpxRecord['cad'] ?? tpxRecord['gpxtpx:cad'])
    const atemp = parseNumber(tpxRecord['atemp'] ?? tpxRecord['gpxtpx:atemp'])
    const power = parseNumber(tpxRecord['power'] ?? tpxRecord['gpxpx:power'])

    if (hr !== null) {
      extensions.heartRate = hr
    }

    if (cad !== null) {
      extensions.cadence = cad
    }

    if (atemp !== null) {
      extensions.temperature = atemp
    }

    if (power !== null) {
      extensions.power = power
    }
  }

  const customKeys = Object.keys(raw).filter(
    (key) =>
      key !== 'TrackPointExtension' &&
      !key.startsWith('gpxtpx:') && !key.startsWith('gpxx:') && !key.startsWith('gpxpx:'),
  )

  if (customKeys.length > 0) {
    extensions.custom = {}

    for (const key of customKeys) {
      const value = raw[key]

      if (typeof value === 'string') {
        extensions.custom[key] = value
      }
    }
  }

  return Object.keys(extensions).length > 0 ? extensions : undefined
}

function parseTrackSegment(raw: GpxTrackSegment): TrackSegment {
  const rawPoints = normalizeToArray(raw.trkpt)
  const points: TrackPoint[] = []

  for (const rawPoint of rawPoints) {
    const point = parseTrackPoint(rawPoint)

    if (point !== null) {
      points.push(point)
    }
  }

  return new TrackSegment(points)
}

function parseTrack(raw: GpxTrack): { segments: TrackSegment[]; options: TrackMetaOptions } {
  const rawSegments = normalizeToArray(raw.trkseg)
  const segments = rawSegments.map(parseTrackSegment)

  const options: TrackMetaOptions = {}

  if (typeof raw.name === 'string') {
    // name goes to TrackMeta via caller
  }

  if (typeof raw.desc === 'string') {
    options.description = raw.desc
  }

  if (typeof raw.src === 'string') {
    options.src = raw.src
  }

  if (typeof raw.type === 'string') {
    options.trackType = raw.type
  }

  if (typeof raw.number === 'number') {
    options.number = raw.number
  }

  return { segments, options }
}

function parseRoute(raw: GpxRoute): { segments: TrackSegment[]; options: TrackMetaOptions } {
  const rawPoints = normalizeToArray(raw.rtept)
  const points: TrackPoint[] = []

  for (const rawPoint of rawPoints) {
    const point = parseTrackPoint(rawPoint)

    if (point !== null) {
      points.push(point)
    }
  }

  const options: TrackMetaOptions = {}

  if (typeof raw.desc === 'string') {
    options.description = raw.desc
  }

  if (typeof raw.type === 'string') {
    options.trackType = raw.type
  }

  return { segments: [new TrackSegment(points)], options }
}

function parseWaypoint(raw: GpxWaypoint): ViewPoint | null {
  const lat = parseNumber(raw.lat)
  const lon = parseNumber(raw.lon)

  if (lat === null || lon === null) {
    return null
  }

  return {
    lat,
    lon,
    ele: parseNumber(raw.ele),
    time: parseDate(raw.time),
    name: typeof raw.name === 'string' ? raw.name : null,
    description: typeof raw.desc === 'string' ? raw.desc : null,
    comment: typeof raw.cmt === 'string' ? raw.cmt : null,
    symbol: typeof raw.sym === 'string' ? raw.sym : null,
    type: typeof raw.type === 'string' ? raw.type : null,
  }
}

function parseMetadata(raw: NonNullable<GpxRoot['metadata']>): TrackMetaOptions {
  const options: TrackMetaOptions = {}

  if (typeof raw.desc === 'string') {
    options.description = raw.desc
  }

  if (raw.author !== undefined && typeof raw.author.name === 'string') {
    options.author = {
      name: raw.author.name,
      email: raw.author.email?.address,
    }
  }

  if (raw.time !== undefined) {
    options.dateTime = parseDate(raw.time)
  }

  if (Array.isArray(raw.links) && raw.links.length > 0) {
    options.links = raw.links.map((link) => ({
      href: String(link.href ?? ''),
      text: typeof link.text === 'string' ? link.text : undefined,
      mimeType: typeof link.type === 'string' ? link.type : undefined,
    }))
  }

  if (raw.copyright !== undefined) {
    options.copyright = {
      author: typeof raw.copyright.author === 'string' ? raw.copyright.author : undefined,
      year: typeof raw.copyright.year === 'number' ? raw.copyright.year : undefined,
      license: typeof raw.copyright.license === 'string' ? raw.copyright.license : undefined,
    }
  }

  return options
}

function payloadText(payload: RawPayload): string {
  if (typeof payload.data !== 'string') {
    throw new Error('GPX payload must be text.')
  }

  return payload.data
}

function escapeXmlText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function formatPoint(point: TrackPoint): string {
  const elevation = point.ele !== null ? `<ele>${point.ele}</ele>` : ''
  const time = point.time !== null ? `<time>${point.time.toISOString()}</time>` : ''
  const extensions = formatExtensions(point.extensions)

  return `<trkpt lat="${point.lat}" lon="${point.lon}">${elevation}${time}${extensions}</trkpt>`
}

function formatExtensions(extensions: TrackPointExtensions | undefined): string {
  if (extensions === undefined) {
    return ''
  }

  const parts: string[] = []

  if (extensions.heartRate !== undefined) {
    parts.push(`<gpxtpx:hr>${extensions.heartRate}</gpxtpx:hr>`)
  }

  if (extensions.cadence !== undefined) {
    parts.push(`<gpxtpx:cad>${extensions.cadence}</gpxtpx:cad>`)
  }

  if (extensions.temperature !== undefined) {
    parts.push(`<gpxtpx:atemp>${extensions.temperature}</gpxtpx:atemp>`)
  }

  if (extensions.power !== undefined) {
    parts.push(`<gpxpx:power>${extensions.power}</gpxpx:power>`)
  }

  if (parts.length === 0) {
    return ''
  }

  return `<extensions><gpxtpx:TrackPointExtension>${parts.join('')}</gpxtpx:TrackPointExtension></extensions>`
}

export class GpxConverter implements TrackConverter {
  public readonly format = 'gpx'

  private readonly parser: XMLParser

  public constructor() {
    this.parser = new XMLParser({
      removeNSPrefix: true,
      ignoreAttributes: false,
      attributeNamePrefix: '',
      isArray: (name) => {
        return name === 'trk' || name === 'trkseg' || name === 'trkpt' ||
          name === 'rte' || name === 'rtept' || name === 'wpt'
      },
      attributeValueProcessor: (name, value) => {
        if (name === 'lat' || name === 'lon') {
          return Number(value)
        }

        return value
      },
    })
  }

  public deserialize(payload: RawPayload): Track[] {
    const text = payloadText(payload)
    const wrapped = this.parser.parse(text) as Record<string, unknown>
    const raw = (wrapped.gpx ?? wrapped) as GpxRoot
    const tracks: Track[] = []

    const metadata = raw.metadata !== undefined ? parseMetadata(raw.metadata) : {}

    const viewpoints = normalizeToArray(raw.wpt)
      .map(parseWaypoint)
      .filter((vp): vp is ViewPoint => vp !== null)

    const rawTracks = normalizeToArray(raw.trk)

    for (const rawTrack of rawTracks) {
      const { segments, options } = parseTrack(rawTrack)
      const name = typeof rawTrack.name === 'string' ? rawTrack.name : null
      const mergedOptions = { ...metadata, ...options }

      const track = new Track(segments, viewpoints)
      const metaOptions: TrackMetaOptions = {
        ...mergedOptions,
        name: name ?? 'GPX track',
      }

      tracks.push(track)
      void metaOptions
    }

    const rawRoutes = normalizeToArray(raw.rte)

    for (const rawRoute of rawRoutes) {
      const { segments, options } = parseRoute(rawRoute)
      const name = typeof rawRoute.name === 'string' ? rawRoute.name : null
      const mergedOptions = { ...metadata, ...options }

      const track = new Track(segments, [])
      const metaOptions: TrackMetaOptions = {
        ...mergedOptions,
        name: name ?? 'GPX route',
      }

      tracks.push(track)
      void metaOptions
    }

    if (tracks.length === 0 && viewpoints.length > 0) {
      tracks.push(new Track([], viewpoints))
    }

    return tracks
  }

  public serialize(track: Track, name: string): RawPayload {
    const escapedName = escapeXmlText(name)
    const segments = track.getSegments()
    const trksegs = segments.map((segment) => {
      const points = segment.getPoints()
      const trkpts = points.map(formatPoint).join('')

      return `<trkseg>${trkpts}</trkseg>`
    }).join('')

    const viewpoints = track.getViewPoints()
    const wpts = viewpoints.map((vp) => {
      const elevation = vp.ele !== null ? `<ele>${vp.ele}</ele>` : ''
      const time = vp.time !== null ? `<time>${vp.time.toISOString()}</time>` : ''
      const vpName = vp.name !== null ? `<name>${escapeXmlText(vp.name)}</name>` : ''
      const desc = vp.description !== null ? `<desc>${escapeXmlText(vp.description)}</desc>` : ''
      const cmt = vp.comment !== null ? `<cmt>${escapeXmlText(vp.comment)}</cmt>` : ''
      const sym = vp.symbol !== null ? `<sym>${escapeXmlText(vp.symbol)}</sym>` : ''
      const type = vp.type !== null ? `<type>${escapeXmlText(vp.type)}</type>` : ''

      return `<wpt lat="${vp.lat}" lon="${vp.lon}">${elevation}${time}${vpName}${desc}${cmt}${sym}${type}</wpt>`
    }).join('')

    const gpx =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<gpx version="1.1" creator="TrackViewer" ' +
      'xmlns="http://www.topografix.com/GPX/1/1" ' +
      'xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" ' +
      'xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" ' +
      'xmlns:gpxpx="http://www.garmin.com/xmlschemas/PowerExtension/v1">' +
      `${wpts}` +
      `<trk><name>${escapedName}</name>${trksegs}</trk>` +
      '</gpx>'

    return {
      data: gpx,
      mimeType: 'application/gpx+xml;charset=utf-8',
    }
  }
}

export const gpxConverter = new GpxConverter()
