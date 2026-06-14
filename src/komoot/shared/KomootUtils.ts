export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

export function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function dateValue(value: unknown): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function idValue(value: unknown): string | null {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null
}

export function embeddedItems(value: unknown): unknown[] {
  if (!isRecord(value) || !isRecord(value._embedded)) {
    return []
  }

  if (Array.isArray(value._embedded.items)) {
    return value._embedded.items
  }

  return Array.isArray(value._embedded.tours) ? value._embedded.tours : []
}

export function linkHref(value: unknown, rel: string): string | null {
  if (!isRecord(value) || !isRecord(value._links) || !isRecord(value._links[rel])) {
    return null
  }

  return stringValue(value._links[rel].href)
}
