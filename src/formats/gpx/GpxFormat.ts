import { Track } from '../../model/Track'
import type { TrackPointInput } from '../../model/TrackPoint'

export type GpxReadResult = {
  track: Track
  sourceText: string
}

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

export async function readGpxFile(file: File): Promise<GpxReadResult> {
  let text: string

  try {
    text = await file.text()
  } catch {
    throw new Error('File could not be read.')
  }

  await new Promise((resolve) => window.setTimeout(resolve, 0))

  const xml = new DOMParser().parseFromString(text, 'application/xml')
  const parseError = xml.getElementsByTagName('parsererror')[0] ?? null

  if (parseError !== null) {
    throw new Error('File could not be parsed as GPX.')
  }

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

  return { track: new Track(points), sourceText: text }
}

export function writeTrimmedGpxFromSource(sourceText: string, visiblePointsCount: number): string {
  const xml = new DOMParser().parseFromString(sourceText, 'application/xml')
  const parseError = xml.getElementsByTagName('parsererror')[0] ?? null

  if (parseError !== null) {
    throw new Error('Source GPX could not be serialized.')
  }

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
