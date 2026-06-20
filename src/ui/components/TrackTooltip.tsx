import {
  Activity,
  Bike,
  CalendarDays,
  Clock,
  Download,
  ExternalLink,
  Folder,
  Footprints,
  Link,
  MountainSnow,
  Ruler,
  Snowflake,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import {
  TrackActivityKind,
  TrackActivityType,
  TrackDifficultyLevel,
  type TrackMeta,
} from '../../model/TrackMeta'
import { formatDateTime, formatDistance, formatDuration } from '../formatters'
import IconButton from '../shared/IconButton'
import Notice from '../shared/Notice'

export type TrackTooltipState = {
  meta: TrackMeta
}

type TrackTooltipProps = {
  tooltip: TrackTooltipState | null
  onClose: () => void
}

const activityLabels: Record<TrackActivityType, string> = {
  [TrackActivityType.Hiking]: 'Hiking',
  [TrackActivityType.Running]: 'Running',
  [TrackActivityType.TouringCycling]: 'Touring cycling',
  [TrackActivityType.MountainBiking]: 'Mountain biking',
  [TrackActivityType.RoadCycling]: 'Road cycling',
  [TrackActivityType.EasyMountainBiking]: 'Easy mountain biking',
  [TrackActivityType.AdvancedMountainBiking]: 'Advanced mountain biking',
  [TrackActivityType.Mountaineering]: 'Mountaineering',
  [TrackActivityType.Climbing]: 'Climbing',
  [TrackActivityType.DownhillMountainBiking]: 'Downhill mountain biking',
  [TrackActivityType.Unicycling]: 'Unicycling',
  [TrackActivityType.CrossCountrySkiing]: 'Cross-country skiing',
  [TrackActivityType.NordicWalking]: 'Nordic walking',
  [TrackActivityType.InlineSkating]: 'Inline skating',
  [TrackActivityType.AlpineSkiing]: 'Alpine skiing',
  [TrackActivityType.SkiTouring]: 'Ski touring',
  [TrackActivityType.Sledding]: 'Sledding',
  [TrackActivityType.Snowboarding]: 'Snowboarding',
  [TrackActivityType.Snowshoeing]: 'Snowshoeing',
  [TrackActivityType.Bikepacking]: 'Bikepacking',
  [TrackActivityType.ElectricTouringCycling]: 'Electric touring cycling',
  [TrackActivityType.ElectricMountainBiking]: 'Electric mountain biking',
  [TrackActivityType.ElectricRoadCycling]: 'Electric road cycling',
  [TrackActivityType.EasyElectricMountainBiking]: 'Easy electric mountain biking',
  [TrackActivityType.AdvancedElectricMountainBiking]: 'Advanced electric mountain biking',
  [TrackActivityType.Other]: 'Other activity',
}

const difficultyLabels: Record<TrackDifficultyLevel, string> = {
  [TrackDifficultyLevel.Easy]: 'Easy',
  [TrackDifficultyLevel.Moderate]: 'Moderate',
  [TrackDifficultyLevel.Difficult]: 'Difficult',
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
  }, [tooltip?.meta])

  if (tooltip === null) return null

  const { meta } = tooltip
  const originalUrl = meta.getOriginalUrl()
  const shareUrl = meta.getShareUrl()

  async function copyShareUrl(): Promise<void> {
    if (shareUrl === null) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setNotice({ kind: 'success', message: 'Link copied' })
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not copy the link.',
      })
    }
  }

  async function downloadGpx(): Promise<void> {
    if (meta.track === null) return

    try {
      await meta.source.saveTrack(meta.track, 'gpx')
    } catch (error) {
      setNotice({
        kind: 'error',
        message: `Could not download GPX: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      })
    }
  }

  return (
    <aside className="surface track-tooltip" aria-label="Track details">
      <header className="surface-header">
        <div className="tooltip-title">
          <h2 title={meta.name}>{meta.name}</h2>
        </div>
        <IconButton variant="ghost" type="button" aria-label="Close track details" title="Close track details" onClick={onClose}>
          <X aria-hidden="true" size={15} strokeWidth={2.2} />
        </IconButton>
      </header>

      <p className="tooltip-source" title={meta.source.name}>
        <Folder aria-hidden="true" size={14} />
        {meta.source.name}
      </p>

      {(meta.activityType !== null || meta.activityKind !== null || meta.dateTime !== null) && (
        <div className="tooltip-properties">
          {meta.activityType !== null && (
            <span>{activityIcon(meta.activityType)}{activityLabels[meta.activityType]}</span>
          )}
          {meta.activityKind !== null && (
            <span><Activity aria-hidden="true" size={14} />{activityKindLabel(meta.activityKind)}</span>
          )}
          {meta.dateTime !== null && (
            <span><CalendarDays aria-hidden="true" size={14} />{formatDateTime(meta.dateTime)}</span>
          )}
        </div>
      )}

      {meta.difficulty !== null && (
        <div className="tooltip-difficulty" aria-label="Difficulty">
          <Difficulty label="Overall" level={meta.difficulty.overall} />
          <Difficulty label="Technical" level={meta.difficulty.technical} />
          <Difficulty label="Physical" level={meta.difficulty.physical} />
        </div>
      )}

      <div className="tooltip-metrics">
        <Metric icon={<Ruler aria-hidden="true" size={15} />} label="Distance" value={
          meta.distanceMeters === null ? 'Unknown' : formatDistance(meta.distanceMeters / 1000)
        } />
        <Metric icon={<Clock aria-hidden="true" size={15} />} label="Duration" value={
          formatDuration(meta.durationSeconds)
        } />
        <Metric icon={<TrendingUp aria-hidden="true" size={15} />} label="Elevation gain" value={
          formatElevation(meta.elevationGainMeters)
        } />
        <Metric icon={<TrendingDown aria-hidden="true" size={15} />} label="Elevation loss" value={
          formatElevation(meta.elevationLossMeters)
        } />
      </div>

      <div className="tooltip-actions">
        {originalUrl !== null && (
          <a className="icon-button details-button" href={originalUrl} target="_blank" rel="noreferrer" aria-label="Open original track" title="Open original track">
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        )}
        {shareUrl !== null && (
          <IconButton type="button" aria-label="Copy link" title="Copy link" onClick={() => void copyShareUrl()}>
            <Link aria-hidden="true" size={14} />
          </IconButton>
        )}
        {meta.track !== null && (
          <IconButton type="button" aria-label="Download GPX" title="Download GPX" onClick={() => void downloadGpx()}>
            <Download aria-hidden="true" size={14} />
          </IconButton>
        )}
      </div>

      {notice !== null && (
        <Notice variant={notice.kind} panel role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.message}
        </Notice>
      )}
    </aside>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <span title={label}>{icon}<small>{label}</small><strong>{value}</strong></span>
}

function Difficulty({ label, level }: { label: string; level: TrackDifficultyLevel | null }) {
  if (level === null) return null

  return (
    <span>
      <small>{label}</small>
      <strong className={`difficulty-${level}`}>{difficultyLabels[level]}</strong>
    </span>
  )
}

function activityKindLabel(kind: TrackActivityKind): string {
  return kind === TrackActivityKind.Planned ? 'Planned' : 'Recorded'
}

function activityIcon(type: TrackActivityType): ReactNode {
  switch (type) {
    case TrackActivityType.TouringCycling:
    case TrackActivityType.MountainBiking:
    case TrackActivityType.RoadCycling:
    case TrackActivityType.EasyMountainBiking:
    case TrackActivityType.AdvancedMountainBiking:
    case TrackActivityType.DownhillMountainBiking:
    case TrackActivityType.Unicycling:
    case TrackActivityType.Bikepacking:
    case TrackActivityType.ElectricTouringCycling:
    case TrackActivityType.ElectricMountainBiking:
    case TrackActivityType.ElectricRoadCycling:
    case TrackActivityType.EasyElectricMountainBiking:
    case TrackActivityType.AdvancedElectricMountainBiking:
      return <Bike aria-hidden="true" size={14} />
    case TrackActivityType.Hiking:
    case TrackActivityType.Running:
    case TrackActivityType.NordicWalking:
      return <Footprints aria-hidden="true" size={14} />
    case TrackActivityType.Mountaineering:
    case TrackActivityType.Climbing:
      return <MountainSnow aria-hidden="true" size={14} />
    case TrackActivityType.CrossCountrySkiing:
    case TrackActivityType.AlpineSkiing:
    case TrackActivityType.SkiTouring:
    case TrackActivityType.Sledding:
    case TrackActivityType.Snowboarding:
    case TrackActivityType.Snowshoeing:
      return <Snowflake aria-hidden="true" size={14} />
    default:
      return <Activity aria-hidden="true" size={14} />
  }
}

function formatElevation(value: number | null): string {
  return value === null ? 'Unknown' : `${Math.round(value)} m`
}
