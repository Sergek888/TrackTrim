import { useMemo, useState, type ChangeEvent } from 'react'
import { komootTrackSource } from '../../application/sources/KomootTrackSource'
import type { TrackOrigin } from '../../model/TrackOrigin'

type KomootImportProps = {
  readonly onOriginSelected: (origin: TrackOrigin) => void
}

export default function KomootImport({ onOriginSelected }: KomootImportProps) {
  const [url, setUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const origin = useMemo<TrackOrigin | null>(
    () => komootTrackSource.createOriginFromUrl(url),
    [url],
  )

  function handleUrlChange(event: ChangeEvent<HTMLInputElement>): void {
    setUrl(event.target.value)
    setErrorMessage(null)
  }

  function handleLoadClick(): void {
    if (origin === null) {
      setErrorMessage('Komoot tour URL is invalid.')
      return
    }

    onOriginSelected(origin)
  }

  return (
    <div className="komoot-import">
      <input
        type="url"
        inputMode="url"
        value={url}
        placeholder="Komoot tour URL"
        aria-label="Komoot tour URL"
        onChange={handleUrlChange}
      />

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
