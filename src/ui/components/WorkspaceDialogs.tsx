import type { KomootConnectionService, KomootConnectionState } from '../../application/KomootConnectionService'
import type { TrackLibrary } from '../../application/TrackLibrary'
import { KomootTrackSource } from '../../application/sources/KomootTrackSource'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { TrackMeta } from '../../model/TrackMeta'
import AddSourceDialog from './AddSourceDialog'
import ColorPalette from './ColorPalette'
import SettingsDialog from './SettingsDialog'

type ColorPaletteState =
  | {
      kind: 'source'
      source: TrackSource
      left: number
      top: number
    }
  | {
      kind: 'track'
      meta: TrackMeta
      left: number
      top: number
    }

type WorkspaceDialogsProps = {
  library: TrackLibrary
  komootConnection: KomootConnectionService
  komootState: KomootConnectionState
  isAddSourceOpen: boolean
  isSettingsOpen: boolean
  colorPalette: ColorPaletteState | null
  onAddSourceClose: () => void
  onSettingsClose: () => void
  onColorPaletteChange: (color: string) => void
  onSourceCreate: (source: TrackSource) => void
}

export default function WorkspaceDialogs({
  library,
  komootConnection,
  komootState,
  isAddSourceOpen,
  isSettingsOpen,
  colorPalette,
  onAddSourceClose,
  onSettingsClose,
  onColorPaletteChange,
  onSourceCreate,
}: WorkspaceDialogsProps) {
  return (
    <>
      {colorPalette !== null && (
        <ColorPalette
          left={colorPalette.left}
          top={colorPalette.top}
          value={
            colorPalette.kind === 'source'
              ? colorPalette.source.color
              : colorPalette.meta.color
          }
          onChange={onColorPaletteChange}
        />
      )}

      {isAddSourceOpen && (
        <AddSourceDialog
          sourceIndex={library.sources.length}
          komootConnection={komootState}
          onCreateKomootSource={({ target, name, color, listType, accountSource }) => {
            const targetType = KomootTrackSource.getTargetType(
              target,
              komootConnection.publicApi(),
            )

            if (!accountSource && targetType !== 'tour' && targetType !== 'collection') {
              throw new Error('Enter a Komoot tour or collection URL.')
            }

            return new KomootTrackSource(
              target,
              name,
              color,
              listType,
              accountSource
                ? komootConnection.accountApi()
                : komootConnection.publicApi(),
            )
          }}
          onOpenSettings={() => {
            onAddSourceClose()
            onSettingsClose()
          }}
          onCancel={onAddSourceClose}
          onCreate={onSourceCreate}
        />
      )}

      {isSettingsOpen && (
        <SettingsDialog
          komootConnection={komootState}
          onClose={onSettingsClose}
          onKomootConnect={(email, password) => komootConnection.connect(email, password)}
          onKomootDisconnect={() => komootConnection.disconnect()}
        />
      )}
    </>
  )
}
