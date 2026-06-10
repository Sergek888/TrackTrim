export type ParsedTourUrl = {
  tourId: string
  shareToken?: string
}

export type ParsedCollectionUrl = {
  collectionId: string
  shareToken?: string
}

export function parseKomootTourUrl(value: string): ParsedTourUrl | null {
  const url = safeUrl(value)

  if (url === null || !isKomootHost(url)) {
    return null
  }

  const match = url.pathname.match(/\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:tour|discover_tours|smart_tours)\/(\d+)/i)

  if (match?.[1] === undefined) {
    return null
  }

  return {
    tourId: match[1],
    shareToken: url.searchParams.get('share_token') ?? url.searchParams.get('shareToken') ?? undefined,
  }
}

export function parseKomootCollectionUrl(value: string): ParsedCollectionUrl | null {
  const url = safeUrl(value)

  if (url === null || !isKomootHost(url)) {
    return null
  }

  const match = url.pathname.match(/\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?collection\/(\d+)/i)

  if (match?.[1] === undefined) {
    return null
  }

  return {
    collectionId: match[1],
    shareToken: url.searchParams.get('share_token') ?? url.searchParams.get('shareToken') ?? undefined,
  }
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function isKomootHost(url: URL): boolean {
  return /^www\.komoot\.[a-z.]+$/i.test(url.hostname) || /^komoot\.[a-z.]+$/i.test(url.hostname)
}

