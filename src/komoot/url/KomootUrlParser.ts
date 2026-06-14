import type { KomootTarget, KomootUserListType } from '../shared/KomootTypes'

const USER_ID_PATTERN = /^\d{6,16}$/

export function parseKomootTarget(
  input: string,
  options: { userListType?: KomootUserListType } = {},
): KomootTarget | null {
  const trimmed = input.trim()

  if (USER_ID_PATTERN.test(trimmed)) {
    return { kind: 'user', id: trimmed, listType: options.userListType ?? 'planned' }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (!/^komoot\.(?:com|de)$/i.test(url.hostname.replace(/^www\./i, ''))) {
    return null
  }

  const parts = url.pathname.split('/').filter(Boolean)
  const offset = /^[a-z]{2}(?:-[a-z]{2})?$/i.test(parts[0] ?? '') ? 1 : 0
  const type = parts[offset]
  const id = parts[offset + 1]
  const shareToken = url.searchParams.get('share_token')

  if (id === undefined || !/^\d+$/.test(id)) {
    return null
  }

  if (type === 'tour' || type === 'discover_tours' || type === 'smart_tours') {
    return { kind: 'tour', id, shareToken }
  }
  if (type === 'collection') {
    return { kind: 'collection', id, shareToken }
  }
  if (type === 'user') {
    return { kind: 'user', id, listType: options.userListType ?? 'planned' }
  }

  return null
}
