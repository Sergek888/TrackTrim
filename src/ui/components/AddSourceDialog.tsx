import { Check, FolderUp, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { LocalFileTrackSource } from '../../application/sources/LocalFileSource'
import {
  KomootTrackSource,
  type KomootUserListType,
} from '../../application/sources/KomootTrackSource'
import type { TrackSource } from '../../application/sources/TrackSource'
import { defaultTrackColor, TRACK_COLORS } from '../trackColors'
import type { KomootConnection } from './sources/KomootConnectDialog'

type AddSourceDialogProps = {
  sourceIndex: number
  komootConnection: KomootConnection
  onOpenSettings: () => void
  onCancel: () => void
  onCreate: (source: TrackSource) => void
}

type SourceMode = 'files' | 'komoot'
type KomootImportMode = KomootUserListType | 'url'

export default function AddSourceDialog({
  sourceIndex,
  komootConnection,
  onOpenSettings,
  onCancel,
  onCreate,
}: AddSourceDialogProps) {
  const [mode, setMode] = useState<SourceMode>('files')
  const [name, setName] = useState('')
  const [color, setColor] = useState(defaultTrackColor(sourceIndex))
  const [files, setFiles] = useState<File[]>([])
  const [url, setUrl] = useState('')
  const [komootImportMode, setKomootImportMode] =
    useState<KomootImportMode>('planned')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const customColorRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  function acceptFiles(nextFiles: File[]): void {
    const supportedFiles = nextFiles.filter((file) => /\.(gpx|xml)$/i.test(file.name))
    setFiles(supportedFiles)
    setErrorMessage(
      supportedFiles.length === nextFiles.length
        ? null
        : 'Only .gpx and .xml files are supported.',
    )
  }

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>): void {
    acceptFiles(Array.from(event.target.files ?? []))
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault()
    acceptFiles(Array.from(event.dataTransfer.files))
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

      if (!komootConnection.connected || komootConnection.userId === undefined) {
        setErrorMessage('Connect Komoot in settings before adding a Komoot source.')
        return
      }

      const sourceTarget =
        komootImportMode === 'url'
          ? url
          : komootConnection.userId

      if (komootImportMode === 'url') {
        const targetType = KomootTrackSource.getTargetType(url)

        if (targetType !== 'tour' && targetType !== 'collection') {
          setErrorMessage('Enter a Komoot tour or collection URL.')
          return
        }
      }

      const listType = komootImportMode === 'recorded' ? 'recorded' : 'planned'
      const fallbackName = komootImportMode === 'url'
        ? 'Komoot source'
        : `${komootConnection.displayName ?? 'Komoot'} ${
            listType === 'planned' ? 'planned' : 'completed'
          }`
      const source = new KomootTrackSource(
        sourceTarget,
        name.trim() === '' ? fallbackName : name.trim(),
        color,
        listType,
        { kind: 'tracktrim-session' },
      )

      source.order = sourceIndex
      onCreate(source)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Source could not be created.')
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel()
    }}>
      <form
        className="add-source-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Add new source"
        autoComplete="on"
        onSubmit={handleSubmit}
      >
        <header>
          <h2>Add New Source</h2>
          <button className="icon-button" type="button" aria-label="Close add source" title="Close" onClick={onCancel}>
            <X aria-hidden="true" size={15} strokeWidth={2.2} />
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
            Komoot
          </button>
        </div>

        <label>
          <span>Name</span>
          <input
            type="text"
            name="source-display-name"
            autoComplete="off"
            value={name}
            placeholder={
              mode === 'files'
                ? 'GPX import'
                : komootImportMode === 'url'
                  ? 'Komoot source'
                  : `${komootConnection.displayName ?? 'Komoot'} ${
                      komootImportMode === 'planned' ? 'planned' : 'completed'
                    }`
            }
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <fieldset className="color-picker-field">
          <legend>Color</legend>
          <div className="color-presets">
            {TRACK_COLORS.map((preset) => (
              <button
                key={preset}
                className={`color-preset${color === preset ? ' is-selected' : ''}`}
                type="button"
                style={{ background: preset }}
                aria-label={`Use color ${preset}`}
                title={`Use color ${preset}`}
                onClick={() => setColor(preset)}
              >
                {color === preset && <Check aria-hidden="true" size={14} />}
              </button>
            ))}
            <button className="custom-color-button" type="button" title="Choose custom color" onClick={() => customColorRef.current?.click()}>
              <span style={{ background: color }} />
            </button>
            <input ref={customColorRef} className="visually-hidden" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </div>
        </fieldset>

        {mode === 'files' ? (
          <div className="file-drop-field">
            <span>GPX files</span>
            <button
              className="file-dropzone"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <FolderUp aria-hidden="true" size={28} />
              <strong>Drag & Drop your .gpx or .xml files here</strong>
              <small>or click to browse</small>
            </button>
            <input ref={fileInputRef} className="visually-hidden" type="file" multiple accept=".gpx,.xml" onChange={handleFilesChange} />
            <small className="selected-files">{files.length === 0 ? 'No files selected' : `${files.length} file${files.length === 1 ? '' : 's'} selected`}</small>
          </div>
        ) : !komootConnection.connected ? (
          <p className="form-note">
            Komoot is not connected.{' '}
            <button className="text-button" type="button" onClick={onOpenSettings}>
              Open settings
            </button>
          </p>
        ) : (
          <>
            <div
              className="segmented-control komoot-import-mode"
              role="group"
              aria-label="Komoot source"
            >
              <button
                type="button"
                className={komootImportMode === 'planned' ? 'is-selected' : ''}
                onClick={() => setKomootImportMode('planned')}
              >
                Planned
              </button>
              <button
                type="button"
                className={komootImportMode === 'recorded' ? 'is-selected' : ''}
                onClick={() => setKomootImportMode('recorded')}
              >
                Completed
              </button>
              <button
                type="button"
                className={komootImportMode === 'url' ? 'is-selected' : ''}
                onClick={() => setKomootImportMode('url')}
              >
                Link
              </button>
            </div>

            {komootImportMode === 'url' && (
              <label>
                <span>Komoot tour or collection URL</span>
                <input
                  type="url"
                  name="komoot-source-url"
                  autoComplete="off"
                  value={url}
                  placeholder="https://www.komoot.com/tour/123456"
                  onChange={(event) => {
                    setUrl(event.target.value)
                    setErrorMessage(null)
                  }}
                />
              </label>
            )}
          </>
        )}

        {errorMessage !== null && <p className="error-message">{errorMessage}</p>}

        <footer>
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="save-button"
            type="submit"
            disabled={mode === 'komoot' && !komootConnection.connected}
          >
            Add Source
          </button>
        </footer>
      </form>
    </div>
  )
}
