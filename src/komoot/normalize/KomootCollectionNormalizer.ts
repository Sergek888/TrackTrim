import type { KomootCollection, KomootCompilationLine, KomootPage } from '../shared/KomootTypes.js'
import { embeddedItems, idValue, isRecord, numberValue, stringValue } from '../shared/KomootUtils.js'
import { coordinateFromResponse } from './KomootTourNormalizer.js'
import { KomootParseError } from '../transport/KomootErrors.js'

export function collectionFromResponse(value: unknown, fallbackId?: string): KomootCollection {
  if (!isRecord(value)) {
    throw new KomootParseError('Komoot collection response is invalid.')
  }

  const id = idValue(value.id) ?? fallbackId
  if (id === undefined) {
    throw new KomootParseError('Komoot collection response has no id.')
  }

  return {
    id,
    name: stringValue(value.name ?? value.title),
    description: stringValue(value.description),
    sourceUrl: `https://www.komoot.com/collection/${id}`,
    raw: value,
  }
}

export function compilationLinesFromResponse(value: unknown): KomootCompilationLine[] {
  const lines: KomootCompilationLine[] = []

  for (const item of embeddedItems(value)) {
    if (!isRecord(item)) {
      continue
    }
    const id = idValue(item.tour_id ?? item.tourId ?? item.id)
    if (id === null) {
      continue
    }
    const geometry = Array.isArray(item.geometry) ? item.geometry : []
    const coordinates = geometry
      .map(coordinateFromResponse)
      .filter((point): point is NonNullable<typeof point> => point !== null)
    lines.push({
      id,
      name: stringValue(item.name),
      distanceMeters: numberValue(item.distance_m ?? item.distance),
      coordinates: coordinates.length === 0 ? null : coordinates,
      raw: item,
    })
  }

  return lines
}

export function collectionPageFromResponse(value: unknown, page: number): KomootPage<KomootCollection> {
  const items = embeddedItems(value).map((item) => collectionFromResponse(item))
  const totalPages = isRecord(value) && isRecord(value.page)
    ? numberValue(value.page.totalPages)
    : null
  return { items, page, totalPages, raw: value }
}
