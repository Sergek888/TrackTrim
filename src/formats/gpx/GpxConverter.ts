import type { ParsedGeometry, RawPayload, TrackConverter } from '../TrackConverter'
import type { TrackPointInput } from '../../model/TrackPoint'

function childText(element: Element, childName: string): string | null {
  for (const child of Array.from(element.children)) {
    if (child.localName === childName) {
      return child.textContent
    }
  }

  return null
}

function parsePointTime(value: string | null): Date | null {
  if (value === null) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function parsePointElevation(value: string | null): number | null {
  if (value === null) {
    return null
  }

  const elevation = Number(value)

  if (!Number.isFinite(elevation)) {
    return null
  }

  return elevation
}

function trackPointElements(xml: Document): Element[] {
  const namespacedTrackPoints = Array.from(xml.getElementsByTagNameNS('*', 'trkpt'))

  return namespacedTrackPoints.length > 0
    ? namespacedTrackPoints
    : Array.from(xml.getElementsByTagName('trkpt'))
}

function parseXml(text: string, errorMessage: string): Document {
  const xml = new DOMParser().parseFromString(text, 'application/xml')
  const parseError = xml.getElementsByTagName('parsererror')[0] ?? null

  if (parseError !== null) {
    throw new Error(errorMessage)
  }

  return xml
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
}

function formatPoint(point: TrackPointInput): string {
  const elevation = point.ele === null ? '' : `<ele>${point.ele}</ele>`
  const time = point.time === null ? '' : `<time>${point.time.toISOString()}</time>`

  return `<trkpt lat="${point.lat}" lon="${point.lon}">${elevation}${time}</trkpt>`
}

export class GpxConverter implements TrackConverter {
  public readonly format = 'gpx'

  public deserialize(payload: RawPayload): ParsedGeometry {
    const xml = parseXml(payloadText(payload), 'File could not be parsed as GPX.')

    const points: TrackPointInput[] = trackPointElements(xml)
      .map((point) => {
        const lat = Number(point.getAttribute('lat'))
        const lon = Number(point.getAttribute('lon'))

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          return null
        }

        return {
          lat,
          lon,
          ele: parsePointElevation(childText(point, 'ele')),
          time: parsePointTime(childText(point, 'time')),
        }
      })
      .filter((point): point is TrackPointInput => point !== null)

    return { points }
  }

  public serialize(points: readonly TrackPointInput[], name: string): RawPayload {
    const escapedName = escapeXmlText(name)
    const trackPoints = points.map((point) => formatPoint(point)).join('')

    return {
      data:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<gpx version="1.1" creator="TrackTrim" xmlns="http://www.topografix.com/GPX/1/1">' +
        `<trk><name>${escapedName}</name><trkseg>${trackPoints}</trkseg></trk>` +
        '</gpx>',
      mimeType: 'application/gpx+xml;charset=utf-8',
    }
  }

  public trimSourceToPointsCount(sourceText: string, visiblePointsCount: number): string {
    const xml = parseXml(sourceText, 'Source GPX could not be serialized.')
    const points = trackPointElements(xml)

    for (const point of points.slice(Math.max(0, visiblePointsCount))) {
      point.parentNode?.removeChild(point)
    }

    const serialized = new XMLSerializer().serializeToString(xml)
    const declaration = sourceText.match(/^\s*(<\?xml[^>]*\?>)/)?.[1] ?? null

    if (declaration !== null && !serialized.startsWith('<?xml')) {
      return `${declaration}\n${serialized}`
    }

    return serialized
  }
}

export const gpxConverter = new GpxConverter()
