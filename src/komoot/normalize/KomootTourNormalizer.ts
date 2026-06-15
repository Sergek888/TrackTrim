import type { KomootCoordinate, KomootTour, KomootTourSummary } from '../shared/KomootTypes.js'
import { dateValue, idValue, isRecord, linkHref, numberValue, stringValue } from '../shared/KomootUtils.js'
import { KomootParseError } from '../transport/KomootErrors.js'

export function coordinateFromResponse(value: unknown): KomootCoordinate | null {
  if (!isRecord(value)) {
    return null
  }

  const lat = numberValue(value.lat)
  const lon = numberValue(value.lng ?? value.lon)
  if (lat === null || lon === null) {
    return null
  }

  return {
    lat,
    lon,
    elevation: numberValue(value.alt ?? value.ele),
    time: dateValue(value.t ?? value.time),
  }
}

export function coordinatesFromResponse(value: unknown): KomootCoordinate[] {
  const items = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.items)
      ? value.items
      : []
  return items.map(coordinateFromResponse).filter((item): item is KomootCoordinate => item !== null)
}

export function summaryFromTourResponse(value: unknown, fallbackId?: string): KomootTourSummary {
  if (!isRecord(value)) {
    throw new KomootParseError('Komoot tour response is invalid.')
  }

  const id = idValue(value.id) ?? fallbackId
  if (id === undefined) {
    throw new KomootParseError('Komoot tour response has no id.')
  }

  return summaryFromRecord(value, id)
}

export function tourFromResponse(value: unknown, fallbackId?: string): KomootTour {
  return { ...summaryFromTourResponse(value, fallbackId), raw: value }
}

export function summaryFromUserTourItem(value: unknown): KomootTourSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const id = idValue(value.id)
  return id === null ? null : summaryFromRecord(value, id)
}

export function summaryFromCompilationLineItem(value: unknown): KomootTourSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const id = idValue(value.tour_id ?? value.tourId ?? value.id)
  if (id === null) {
    return null
  }

  const geometry = Array.isArray(value.geometry) ? value.geometry : []
  const coordinates = geometry
    .map(coordinateFromResponse)
    .filter((item): item is KomootCoordinate => item !== null)

  return {
    ...summaryFromRecord(value, id),
    coordinates: coordinates.length === 0 ? null : coordinates,
  }
}

export function uniqueTourSummaries(items: readonly KomootTourSummary[]): KomootTourSummary[] {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

function summaryFromRecord(value: Record<string, unknown>, id: string): KomootTourSummary {
  return {
    id,
    name: stringValue(value.name),
    date: dateValue(value.date),
    distanceMeters: numberValue(value.distance_m ?? value.distance),
    coordinatesUrl: linkHref(value, 'coordinates') ?? `/tours/${id}/coordinates`,
    coordinates: null,
    sport: stringValue(value.sport),
    durationSeconds: numberValue(value.duration ?? value.time_in_motion),
    elevationUpMeters: numberValue(value.elevation_up ?? value.elevation_up_m),
    elevationDownMeters: numberValue(value.elevation_down ?? value.elevation_down_m),
    sourceUrl: `https://www.komoot.com/tour/${id}`,
    raw: value,
  }
}
