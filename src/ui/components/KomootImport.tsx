import { useMemo, useState, type ChangeEvent } from 'react'
import { KomootTourTrackSource } from '../../application/sources/KomootTrackSource'
import type { TrackSource } from '../../application/sources/TrackSource'
import { defaultTrackColor } from '../trackColors'

type KomootImportProps = {
  readonly onSourceSelected: (source: TrackSource) => void
}

export default function KomootImport({ onSourceSelected }: KomootImportProps) {
  const [url, setUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canLoadUrl = useMemo(
    () => KomootTourTrackSource.canLoadUrl(url),
    [url],
  )

  function handleUrlChange(event: ChangeEvent<HTMLInputElement>): void {
    setUrl(event.target.value)
    setErrorMessage(null)
  }

  function handleLoadClick(): void {
    if (!canLoadUrl) {
      setErrorMessage('Komoot tour URL is invalid.')
      return
    }

    onSourceSelected(new KomootTourTrackSource(url, 'Komoot tour', defaultTrackColor(0)))
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
