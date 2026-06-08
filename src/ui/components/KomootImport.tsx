import { useMemo, useState, type ChangeEvent } from 'react'
import {
  KomootTrackSource,
  type KomootUserListType,
} from '../../application/sources/KomootTrackSource'
import type { TrackSource } from '../../application/sources/TrackSource'
import { defaultTrackColor } from '../trackColors'

type KomootImportProps = {
  readonly onSourceSelected: (source: TrackSource) => void
}

export default function KomootImport({ onSourceSelected }: KomootImportProps) {
  const [url, setUrl] = useState('')
  const [userListType, setUserListType] = useState<KomootUserListType>('planned')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canLoadUrl = useMemo(
    () => KomootTrackSource.canLoadUrl(url, userListType),
    [url, userListType],
  )
  const targetType = KomootTrackSource.getTargetType(url)

  function handleUrlChange(event: ChangeEvent<HTMLInputElement>): void {
    setUrl(event.target.value)
    setErrorMessage(null)
  }

  function handleLoadClick(): void {
    if (!canLoadUrl) {
      setErrorMessage('Komoot tour, collection, profile URL, or user id is invalid.')
      return
    }

    const fallbackName =
      targetType === 'user'
        ? `Komoot ${userListType === 'planned' ? 'planned' : 'completed'}`
        : 'Komoot source'

    onSourceSelected(
      new KomootTrackSource(url, fallbackName, defaultTrackColor(0), userListType),
    )
  }

  return (
    <div className="komoot-import">
      <input
        type="text"
        inputMode="url"
        value={url}
        placeholder="Komoot URL or user id"
        aria-label="Komoot URL or user id"
        onChange={handleUrlChange}
      />

      {targetType === 'user' && (
        <div className="segmented-control" role="group" aria-label="Komoot user source">
          <button
            type="button"
            className={userListType === 'planned' ? 'is-selected' : ''}
            onClick={() => setUserListType('planned')}
          >
            Planned
          </button>
          <button
            type="button"
            className={userListType === 'recorded' ? 'is-selected' : ''}
            onClick={() => setUserListType('recorded')}
          >
            Completed
          </button>
        </div>
      )}

      <button
        className="secondary-button"
        type="button"
        onClick={handleLoadClick}
        disabled={url.trim() === ''}
      >
        Load
      </button>

      {errorMessage !== null && <p className="komoot-import-error">{errorMessage}</p>}
    </div>
  )
}
