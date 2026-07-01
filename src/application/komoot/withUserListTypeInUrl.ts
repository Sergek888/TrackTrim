import type { KomootApi, KomootUserListType } from '../../komoot/KomootApi.js'

export function withUserListTypeInUrl(
  input: string,
  listType: KomootUserListType,
  komootApi: KomootApi,
): string {
  const target = komootApi.urls.parse(input)

  if (target?.kind !== 'user') {
    return input
  }

  let url: URL
  try {
    url = new URL(input)
  } catch {
    url = new URL(komootApi.urls.getUserUrl(target.id))
  }

  if (!url.searchParams.has('type')) {
    url.searchParams.set('type', listType === 'planned' ? 'planned' : 'completed')
  }

  return url.toString()
}
