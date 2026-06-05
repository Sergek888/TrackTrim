import { useState, type ChangeEvent, type FormEvent } from 'react'
import { LocalFileTrackSource } from '../../application/sources/LocalFileSource'
import { KomootTourTrackSource } from '../../application/sources/KomootTrackSource'
import type { TrackSource } from '../../application/sources/TrackSource'
import { defaultTrackColor } from '../trackColors'

type AddSourceDialogProps = {
  sourceIndex: number
  onCancel: () => void
  onCreate: (source: TrackSource) => void
}

type SourceMode = 'files' | 'komoot'

export default function AddSourceDialog({
  sourceIndex,
  onCancel,
  onCreate,
}: AddSourceDialogProps) {
  const [mode, setMode] = useState<SourceMode>('files')
  const [name, setName] = useState('')
  const [color, setColor] = useState(defaultTrackColor(sourceIndex))
  const [files, setFiles] = useState<File[]>([])
  const [url, setUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>): void {
    setFiles(Array.from(event.target.files ?? []))
    setErrorMessage(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    try {
      if (mode === 'files') {
        if (files.length === 0) {
          setErrorMessage('Select at least one GPX file.')
          return
        }

        const source = new LocalFileTrackSource(
          files,
          name.trim() === '' ? 'GPX import' : name.trim(),
          color,
        )

        source.order = sourceIndex
        onCreate(source)
        return
      }

      if (!KomootTourTrackSource.canLoadUrl(url)) {
        setErrorMessage('Komoot tour URL is invalid.')
        return
      }

      const source = new KomootTourTrackSource(
        url,
        name.trim() === '' ? 'Komoot tour' : name.trim(),
        color,
      )

      source.order = sourceIndex
      onCreate(source)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Source could not be created.')
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="add-source-dialog" aria-label="Add source" onSubmit={handleSubmit}>
        <header>
          <h2>Add source</h2>
          <button className="icon-button" type="button" aria-label="Close" onClick={onCancel}>
            X
          </button>
        </header>

        <div className="segmented-control" role="group" aria-label="Source type">
          <button
            type="button"
            className={mode === 'files' ? 'is-selected' : ''}
            onClick={() => setMode('files')}
          >
            GPX files
          </button>
          <button
            type="button"
            className={mode === 'komoot' ? 'is-selected' : ''}
            onClick={() => setMode('komoot')}
          >
            Komoot URL
          </button>
        </div>

        <label>
          <span>Name</span>
          <input
            type="text"
            value={name}
            placeholder={mode === 'files' ? 'GPX import' : 'Komoot tour'}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label>
          <span>Color</span>
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </label>

        {mode === 'files' ? (
          <label>
            <span>GPX files</span>
            <input type="file" multiple accept=".gpx,.xml" onChange={handleFilesChange} />
          </label>
        ) : (
          <label>
            <span>Komoot tour URL</span>
            <input
              type="url"
              value={url}
              placeholder="https://www.komoot.com/tour/..."
              onChange={(event) => {
                setUrl(event.target.value)
                setErrorMessage(null)
              }}
            />
          </label>
        )}

        {errorMessage !== null && <p className="error-message">{errorMessage}</p>}

        <footer>
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="save-button" type="submit">
            Add
          </button>
        </footer>
      </form>
    </div>
  )
}
