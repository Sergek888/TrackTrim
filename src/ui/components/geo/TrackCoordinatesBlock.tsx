import type { TrackMeta } from '../../../model/TrackMeta'
import { buildGeoPointMenuItems } from '../../../application/geo/GeoPointMenuBuilder'
import GeoPointActions from './GeoPointActions'
import { copyText } from '../../external-links/copyText'
import { openExternalUrl } from '../../external-links/openExternalUrl'

type TrackCoordinatesBlockProps = {
  meta: TrackMeta
}

export default function TrackCoordinatesBlock({ meta }: TrackCoordinatesBlockProps) {
  const startPoint = meta.startPoint
  const finishPoint = meta.finishPoint

  if (startPoint === null && finishPoint === null) {
    return null
  }

  async function handleCopy(value: string): Promise<void> {
    try {
      await copyText(value)
    } catch {
      // Silently fail - user will see no feedback
    }
  }

  function handleOpenExternal(url: string): void {
    openExternalUrl(url)
  }

  return (
    <div className="track-coordinates-block">
      {startPoint !== null && (
        <div className="track-coordinates-point">
          <span className="track-coordinates-label">Старт</span>
          <GeoPointActions
            items={buildGeoPointMenuItems(startPoint)}
            onCopy={handleCopy}
            onOpenExternal={handleOpenExternal}
          />
        </div>
      )}
      {finishPoint !== null && (
        <div className="track-coordinates-point">
          <span className="track-coordinates-label">Финиш</span>
          <GeoPointActions
            items={buildGeoPointMenuItems(finishPoint)}
            onCopy={handleCopy}
            onOpenExternal={handleOpenExternal}
          />
        </div>
      )}
    </div>
  )
}
