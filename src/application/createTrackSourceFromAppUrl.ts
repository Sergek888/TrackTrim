import type { KomootCredentials } from '../komoot/KomootApi'
import { KomootTrackSource } from './sources/KomootTrackSource'
import type { TrackSource } from './sources/TrackSource'

type CreateTrackSourceOptions = {
  color: string
  order: number
  komootCredentials: KomootCredentials | null
}

export function createTrackSourceFromAppUrl(
  appUrl: string,
  options: CreateTrackSourceOptions,
): TrackSource | null {
  const sourceUrl = new URL(appUrl).searchParams.get('source')

  if (sourceUrl === null) {
    return null
  }

  const targetType = KomootTrackSource.getTargetType(sourceUrl)

  if (targetType === null) {
    throw new Error('The source link is not supported.')
  }

  const source = new KomootTrackSource(
    sourceUrl,
    targetType === 'tour'
      ? 'Komoot tour'
      : targetType === 'collection'
        ? 'Komoot collection'
        : 'Komoot profile',
    options.color,
    'planned',
    options.komootCredentials,
  )

  source.order = options.order

  return source
}
