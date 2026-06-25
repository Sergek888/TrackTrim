import type { KomootConnectionService, KomootConnectionState } from '../../application/KomootConnectionService'
import type { TrackLibrary } from '../../application/TrackLibrary'
import { KomootTrackSource } from '../../application/sources/KomootTrackSource'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { TrackMeta } from '../../model/TrackMeta'
import type { MapSettings } from '../../map/mapSettings'
import MapLayerPanel from '../map/MapLayerPanel'
import AddSourcePanel from './AddSourcePanel'
import ColorPalette from './ColorPalette'
import SettingsPanel from './SettingsPanel'

type ColorPaletteState =
  | { kind: 'source'; source: TrackSource; left: number; top: number }
  | { kind: 'track'; meta: TrackMeta; left: number; top: number }

type WorkspacePanelsProps = {
  library: TrackLibrary
  komootConnection: KomootConnectionService
  komootState: KomootConnectionState
  isAddSourceOpen: boolean
  isSettingsOpen: boolean
  isMapSettingsOpen: boolean
  mapSettings: MapSettings
  colorPalette: ColorPaletteState | null
  onAddSourceClose: () => void
  onSettingsClose: () => void
  onSettingsOpen: () => void
  onMapSettingsClose: () => void
  onMapSettingsChange: (settings: MapSettings) => void
  onColorPaletteChange: (color: string) => void
  onSourceCreate: (source: TrackSource) => void
}

export default function WorkspacePanels({
  library,
  komootConnection,
  komootState,
  isAddSourceOpen,
  isSettingsOpen,
  isMapSettingsOpen,
  mapSettings,
  colorPalette,
  onAddSourceClose,
  onSettingsClose,
  onSettingsOpen,
  onMapSettingsClose,
  onMapSettingsChange,
  onColorPaletteChange,
  onSourceCreate,
}: WorkspacePanelsProps) {
  return (
    <>
      {colorPalette !== null && (
        <ColorPalette
          left={colorPalette.left}
          top={colorPalette.top}
          value={colorPalette.kind === 'source' ? colorPalette.source.color : colorPalette.meta.color}
          onChange={onColorPaletteChange}
        />
      )}

      {isAddSourceOpen && (
        <AddSourcePanel
          sourceIndex={library.sources.length}
          komootConnection={komootState}
          onCreateKomootSource={({ target, name, color, listType, accountSource }) => {
            const targetType = KomootTrackSource.getTargetType(target, komootConnection.publicApi())

            if (!accountSource && targetType !== 'tour' && targetType !== 'collection') {
              throw new Error('Enter a Komoot tour or collection URL.')
            }

            return new KomootTrackSource(
              target,
              name,
              color,
              listType,
              accountSource ? komootConnection.accountApi() : komootConnection.publicApi(),
            )
          }}
          onOpenSettings={() => {
            onSettingsOpen()
          }}
          onCancel={onAddSourceClose}
          onCreate={onSourceCreate}
        />
      )}

      {isSettingsOpen && (
        <SettingsPanel
          komootConnection={komootState}
          onClose={onSettingsClose}
          onKomootConnect={(email, password) => komootConnection.connect(email, password)}
          onKomootDisconnect={() => komootConnection.disconnect()}
        />
      )}

      {isMapSettingsOpen && (
        <MapLayerPanel
          settings={mapSettings}
          onChange={onMapSettingsChange}
          onClose={onMapSettingsClose}
        />
      )}
    </>
  )
}
