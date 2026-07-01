import type { KomootConnectionService, KomootConnectionState } from '../../application/KomootConnectionService'
import type { TrackLibrary } from '../../application/TrackLibrary'
import { configureKomootApi } from '../../application/komoot/getKomootApi'
import { withUserListTypeInUrl } from '../../application/komoot/withUserListTypeInUrl'
import { KomootTrackSource } from '../../application/sources/KomootTrackSource'
import type { TrackSource } from '../../application/sources/TrackSource'
import type { TrackMeta } from '../../model/TrackMeta'
import type { MapSettings } from '../../map/mapSettings'
import type { MapLayerStatusState } from '../../map/mapLayerStatus'
import MapLayerPanel from '../map/MapLayerPanel'
import AddSourcePanel from './AddSourcePanel'
import ColorPalette from './ColorPalette'
import LayerAvailabilityPanel from './LayerAvailabilityPanel'
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
  isLayerAvailabilityOpen: boolean
  mapSettings: MapSettings
  layerStatus?: MapLayerStatusState
  colorPalette: ColorPaletteState | null
  onAddSourceClose: () => void
  onSettingsClose: () => void
  onSettingsOpen: () => void
  onMapSettingsClose: () => void
  onMapSettingsChange: (settings: MapSettings) => void
  onLayerAvailabilityClose: () => void
  onLayerAvailabilityOpen: () => void
  onColorPaletteChange: (color: string) => void
  onSourceCreate: (source: TrackSource) => void
  onBackToTracks: () => void
}

export default function WorkspacePanels({
  library,
  komootConnection,
  komootState,
  isAddSourceOpen,
  isSettingsOpen,
  isMapSettingsOpen,
  isLayerAvailabilityOpen,
  mapSettings,
  layerStatus,
  colorPalette,
  onAddSourceClose,
  onSettingsClose,
  onSettingsOpen,
  onMapSettingsClose,
  onMapSettingsChange,
  onLayerAvailabilityClose,
  onLayerAvailabilityOpen,
  onColorPaletteChange,
  onSourceCreate,
  onBackToTracks,
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
            const publicApi = komootConnection.publicApi()
            const targetType = KomootTrackSource.getTargetType(target, publicApi)

            if (!accountSource && targetType !== 'tour' && targetType !== 'collection') {
              throw new Error('Enter a Komoot tour or collection URL.')
            }

            const komootApi = accountSource ? komootConnection.accountApi() : publicApi
            const sourceUrl = accountSource
              ? withUserListTypeInUrl(target, listType, publicApi)
              : target

            configureKomootApi(komootApi)

            return new KomootTrackSource({
              url: sourceUrl,
              name,
              color,
            })
          }}
          onOpenSettings={() => {
            onSettingsOpen()
          }}
          onCancel={onAddSourceClose}
          onCreate={onSourceCreate}
          onBack={onBackToTracks}
        />
      )}

      {isSettingsOpen && (
        <SettingsPanel
          komootConnection={komootState}
          onClose={onSettingsClose}
          onKomootConnect={(email, password) => komootConnection.connect(email, password)}
          onKomootDisconnect={() => komootConnection.disconnect()}
          onOpenAvailability={onLayerAvailabilityOpen}
          onBack={onBackToTracks}
        />
      )}

      {isLayerAvailabilityOpen && (
        <LayerAvailabilityPanel
          settings={mapSettings}
          onChange={onMapSettingsChange}
          onClose={onLayerAvailabilityClose}
          onBack={() => {
            onLayerAvailabilityClose()
            onSettingsOpen()
          }}
        />
      )}

      {isMapSettingsOpen && (
        <MapLayerPanel
          settings={mapSettings}
          layerStatus={layerStatus}
          onChange={onMapSettingsChange}
          onClose={onMapSettingsClose}
          onBack={onBackToTracks}
        />
      )}
    </>
  )
}
