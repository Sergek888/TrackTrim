import type { KomootApi } from '../komoot/KomootApi.js'
import { configureKomootApi } from './komoot/getKomootApi.js'
import { KomootTrackSource } from './sources/KomootTrackSource.js'
import type { TrackSource } from './sources/TrackSource.js'

type CreateTrackSourceOptions = {
  color: string
  order: number
  komootApi: KomootApi
}

export function createTrackSourceFromAppUrl(
  appUrl: string,
  options: CreateTrackSourceOptions,
): TrackSource | null {
  const sourceUrl = new URL(appUrl).searchParams.get('source')

  if (sourceUrl === null) {
    return null
  }

  const targetType = KomootTrackSource.getTargetType(sourceUrl, options.komootApi)

  if (targetType === null) {
    throw new Error('The source link is not supported.')
  }

  configureKomootApi(options.komootApi)

  return new KomootTrackSource({
    url: sourceUrl,
    name: targetType === 'tour'
      ? 'Komoot tour'
      : targetType === 'collection'
        ? 'Komoot collection'
        : 'Komoot profile',
    color: options.color,
    order: options.order,
  })
}
