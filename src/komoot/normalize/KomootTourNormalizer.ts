import type {
  KomootCoordinate,
  KomootDifficulty,
  KomootDifficultyLevel,
  KomootSport,
  KomootTour,
  KomootTourKind,
  KomootTourSummary,
} from '../shared/KomootTypes.js'
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
    time: dateValue(value.time),
    elapsedSeconds: elapsedSecondsValue(value.t),
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

export function summaryFromUserTourItem(
  value: unknown,
  fallbackKind: KomootTourKind | null = null,
): KomootTourSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const id = idValue(value.id)
  return id === null ? null : summaryFromRecord(value, id, fallbackKind)
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

function summaryFromRecord(
  value: Record<string, unknown>,
  id: string,
  fallbackKind: KomootTourKind | null = null,
): KomootTourSummary {
  return {
    id,
    name: stringValue(value.name),
    date: dateValue(value.date),
    distanceMeters: numberValue(value.distance_m ?? value.distance),
    coordinatesUrl: linkHref(value, 'coordinates') ?? `/tours/${id}/coordinates`,
    coordinates: null,
    sport: sportValue(value.sport),
    kind: tourKindValue(value.type) ?? fallbackKind,
    difficulty: difficultyValue(value.difficulty),
    changedAt: dateValue(value.changed_at),
    durationSeconds: numberValue(value.duration ?? value.time_in_motion),
    elevationUpMeters: numberValue(value.elevation_up ?? value.elevation_up_m),
    elevationDownMeters: numberValue(value.elevation_down ?? value.elevation_down_m),
    sourceUrl: `https://www.komoot.com/tour/${id}`,
    raw: value,
  }
}

function elapsedSecondsValue(value: unknown): number | null {
  const elapsedMilliseconds = numberValue(value)

  return elapsedMilliseconds === null ? null : elapsedMilliseconds / 1000
}

function sportValue(value: unknown): KomootSport | null {
  const sport = stringValue(value)

  switch (sport) {
    case 'hike':
    case 'jogging':
    case 'touringbicycle':
    case 'mtb':
    case 'racebike':
    case 'mtb_easy':
    case 'mtb_advanced':
    case 'mountaineering':
    case 'climbing':
    case 'downhillbike':
    case 'unicycle':
    case 'nordic':
    case 'nordicwalking':
    case 'skaten':
    case 'skialpin':
    case 'skitour':
    case 'sled':
    case 'snowboard':
    case 'snowshoe':
    case 'bikepacking':
    case 'e_touringbicycle':
    case 'e_mtb':
    case 'e_racebike':
    case 'e_mtb_easy':
    case 'e_mtb_advanced':
    case 'other':
      return sport
    case null:
      return null
    default:
      return 'other'
  }
}

function tourKindValue(value: unknown): KomootTourKind | null {
  switch (stringValue(value)) {
    case 'tour_planned':
    case 'planned':
      return 'planned'
    case 'tour_recorded':
    case 'recorded':
      return 'recorded'
    default:
      return null
  }
}

function difficultyValue(value: unknown): KomootDifficulty | null {
  if (!isRecord(value)) {
    return null
  }

  const overall = difficultyLevelValue(value.grade)
  const technical = explanationLevelValue(value.explanation_technical, 't')
  const physical = explanationLevelValue(value.explanation_fitness, 'c')

  if (overall === null && technical === null && physical === null) {
    return null
  }

  return { overall, technical, physical }
}

function difficultyLevelValue(value: unknown): KomootDifficultyLevel | null {
  switch (stringValue(value)) {
    case 'easy':
      return 'easy'
    case 'moderate':
      return 'moderate'
    case 'difficult':
      return 'difficult'
    default:
      return null
  }
}

const TECHNICAL_DIFFICULTY_REGEX = /t([123])$/
const PHYSICAL_DIFFICULTY_REGEX = /c([123])$/

function explanationLevelValue(
  value: unknown,
  marker: 't' | 'c',
): KomootDifficultyLevel | null {
  const explanation = stringValue(value)?.toLowerCase() ?? null
  const regex = marker === 't' ? TECHNICAL_DIFFICULTY_REGEX : PHYSICAL_DIFFICULTY_REGEX
  const match = explanation?.match(regex) ?? null

  switch (match?.[1]) {
    case '1':
      return 'easy'
    case '2':
      return 'moderate'
    case '3':
      return 'difficult'
    default:
      return null
  }
}
