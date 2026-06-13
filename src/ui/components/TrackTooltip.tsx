import { Clock, Download, ExternalLink, Folder, Link, Mountain, Ruler, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Track } from '../../model/Track'
import { formatDistance, formatDuration } from '../formatters'

export type TrackTooltipState = {
  track: Track
}

type TrackTooltipProps = {
  tooltip: TrackTooltipState | null
  onClose: () => void
}

export default function TrackTooltip({ tooltip, onClose }: TrackTooltipProps) {
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (notice === null) return

    const timeoutId = window.setTimeout(() => setNotice(null), 2500)

    return () => window.clearTimeout(timeoutId)
  }, [notice])

  useEffect(() => {
    setNotice(null)
  }, [tooltip?.track])

  if (tooltip === null) return null

  const { track } = tooltip
  const meta = track.meta
  const originalUrl = meta?.getOriginalUrl() ?? null
  const shareUrl = meta?.getShareUrl() ?? null
  const elevationGainM = track.elevationGainM()

  async function copyShareUrl(): Promise<void> {
    if (shareUrl === null) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setNotice({ kind: 'success', message: 'Ссылка скопирована' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Не удалось скопировать ссылку.',
      })
    }
  }

  async function downloadGpx(): Promise<void> {
    if (meta === null) return

    try {
      await meta.source.saveTrack(track, 'gpx')
    } catch (error) {
      setNotice({
        kind: 'error',
        message: `Не удалось скачать GPX: ${
          error instanceof Error ? error.message : 'неизвестная ошибка'
        }`,
      })
    }
  }

  return (
    <aside className="track-tooltip" aria-label="Track details">
      <header>
        <div className="tooltip-title">
          <h2 title={meta?.name ?? 'Track'}>{meta?.name ?? 'Track'}</h2>
        </div>
        <button className="icon-button ghost-button" type="button" aria-label="Close track details" title="Close track details" onClick={onClose}>
          <X aria-hidden="true" size={16} />
        </button>
      </header>

      <p className="tooltip-source" title={meta?.source.name ?? 'Unknown source'}>
        <Folder aria-hidden="true" size={14} />
        {meta?.source.name ?? 'Unknown source'}
      </p>

      <div className="tooltip-metrics">
        <span title="Distance"><Ruler aria-hidden="true" size={15} />{formatDistance(track.distanceKm())}</span>
        <i aria-hidden="true" />
        <span title="Elevation gain"><Mountain aria-hidden="true" size={15} />{elevationGainM === null ? 'Unknown' : `${Math.round(elevationGainM)} m`}</span>
        <i aria-hidden="true" />
        <span title="Duration"><Clock aria-hidden="true" size={15} />{formatDuration(track.durationSec())}</span>
      </div>

      <div className="tooltip-actions">
        {originalUrl !== null && (
          <a
            className="icon-button details-button"
            href={originalUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open original track"
            title="Open original track"
          >
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        )}
        {shareUrl !== null && (
          <button
            className="icon-button details-button"
            type="button"
            aria-label="Скопировать ссылку"
            title="Скопировать ссылку"
            onClick={() => void copyShareUrl()}
          >
            <Link aria-hidden="true" size={14} />
          </button>
        )}
        {meta !== null && (
          <button
            className="icon-button details-button"
            type="button"
            aria-label="Скачать GPX"
            title="Скачать GPX"
            onClick={() => void downloadGpx()}
          >
            <Download aria-hidden="true" size={14} />
          </button>
        )}
      </div>

      {notice !== null && (
        <p className={`tooltip-notice is-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.message}
        </p>
      )}
    </aside>
  )
}
