const KOMOOT_TOUR_LINK_PATTERN =
  /\/(?:tour|discover_tours|smart_tours)\/(\d+)/gi

export function extractKomootTourIdsFromText(text: string): string[] {
  const ids: string[] = []

  for (const match of text.matchAll(KOMOOT_TOUR_LINK_PATTERN)) {
    const tourId = match[1]

    if (tourId !== undefined) {
      ids.push(tourId)
    }
  }

  return Array.from(new Set(ids))
}
