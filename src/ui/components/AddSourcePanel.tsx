import { Check, FolderUp } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import type { KomootConnectionState } from '../../application/KomootConnectionService'
import { LocalFileTrackSource } from '../../application/sources/LocalFileSource'
import type { TrackSource } from '../../application/sources/TrackSource'
import { defaultTrackColor, TRACK_COLORS } from '../trackColors'
import Button from '../shared/Button'
import FormField from '../shared/FormField'
import Notice from '../shared/Notice'
import Panel from '../shared/Panel'
import SegmentedControl from '../shared/SegmentedControl'
import TextInput from '../shared/TextInput'

type KomootUserListType = 'planned' | 'recorded'

type CreateKomootSourceInput = {
  target: string
  name: string
  color: string
  listType: KomootUserListType
  accountSource: boolean
}

type AddSourcePanelProps = {
  sourceIndex: number
  komootConnection: KomootConnectionState
  onCreateKomootSource: (input: CreateKomootSourceInput) => TrackSource
  onOpenSettings: () => void
  onCancel: () => void
  onCreate: (source: TrackSource) => void
  onBack?: () => void
}

type SourceMode = 'files' | 'komoot'
type KomootImportMode = KomootUserListType | 'url'

const SOURCE_TYPE_SEGMENTS = [
  { value: 'files', label: 'GPX files' },
  { value: 'komoot', label: 'Komoot' },
] as const

export default function AddSourcePanel({
  sourceIndex,
  komootConnection,
  onCreateKomootSource,
  onOpenSettings,
  onCancel,
  onCreate,
  onBack,
}: AddSourcePanelProps) {
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
  const komootDisplayName = komootConnection.connected
    ? komootConnection.displayName ?? 'Komoot'
    : 'Komoot'

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

      const accountSource = komootImportMode !== 'url'

      if (accountSource && !komootConnection.connected) {
        setErrorMessage('Connect Komoot in settings before adding a Komoot source.')
        return
      }

      const sourceTarget =
        komootImportMode === 'url'
          ? url
          : komootConnection.connected
            ? komootConnection.userId
            : ''

      const listType = komootImportMode === 'recorded' ? 'recorded' : 'planned'
      const fallbackName = komootImportMode === 'url'
        ? 'Komoot source'
        : `${komootDisplayName} ${
            listType === 'planned' ? 'planned' : 'completed'
          }`
      const source = onCreateKomootSource({
        target: sourceTarget,
        name: name.trim() === '' ? fallbackName : name.trim(),
        color,
        listType,
        accountSource,
      })

      source.order = sourceIndex
      onCreate(source)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Source could not be created.')
    }
  }

  const komootImportSegments = [
    { value: 'planned', label: 'Planned', disabled: !komootConnection.connected },
    { value: 'recorded', label: 'Completed', disabled: !komootConnection.connected },
    { value: 'url', label: 'Link' },
  ]

  return (
    <Panel
      title="Add New Source"
      ariaLabel="Add new source"
      onClose={onCancel}
      onBack={onBack}
      backLabel="Back to tracks"
      closeLabel="Close add source"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            form="add-source-form"
            disabled={
              mode === 'komoot' &&
              komootImportMode !== 'url' &&
              !komootConnection.connected
            }
          >
            Add Source
          </Button>
        </>
      }
    >
      <form id="add-source-form" autoComplete="on" onSubmit={handleSubmit}>
        <SegmentedControl
          segments={SOURCE_TYPE_SEGMENTS}
          value={mode}
          onChange={(value) => setMode(value as SourceMode)}
          ariaLabel="Source type"
        />

        <div className="panel-section">
          <FormField label="Name">
            <TextInput
              type="text"
              name="source-display-name"
              autoComplete="off"
              value={name}
              placeholder={
                mode === 'files'
                  ? 'GPX import'
                  : komootImportMode === 'url'
                    ? 'Komoot source'
                    : `${komootDisplayName} ${
                        komootImportMode === 'planned' ? 'planned' : 'completed'
                      }`
              }
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>

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
        </div>

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
        ) : (
          <div className="panel-section">
            <h3>Komoot</h3>
            <SegmentedControl
              segments={komootImportSegments}
              value={komootImportMode}
              onChange={(value) => setKomootImportMode(value as KomootImportMode)}
              columns={3}
              ariaLabel="Komoot source"
            />

            {!komootConnection.connected && komootImportMode !== 'url' && (
              <p className="form-note">
                Komoot is not connected.{' '}
                <Button type="button" variant="text" onClick={onOpenSettings}>
                  Open settings
                </Button>
              </p>
            )}

            {komootImportMode === 'url' && (
              <FormField label="Komoot tour or collection URL">
                <TextInput
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
              </FormField>
            )}
          </div>
        )}

        {errorMessage !== null && <Notice variant="error">{errorMessage}</Notice>}
      </form>
    </Panel>
  )
}
