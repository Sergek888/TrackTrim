import type { CSSProperties } from 'react'

type TimeSliderProps = {
  durationSec: number
  trimEndDurationSec: number
  onChange: (value: number) => void
}

function formatPreviewDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (hours > 0) {
    return remainingSeconds > 0
      ? `${hours}h ${minutes}m ${remainingSeconds}s`
      : `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  return `${remainingSeconds}s`
}

export default function TimeSlider({
  durationSec,
  trimEndDurationSec,
  onChange,
}: TimeSliderProps) {
  const cutFromEndPercent =
    durationSec <= 0
      ? 0
      : Math.max(0, Math.min(100, (trimEndDurationSec / durationSec) * 100))
  const sliderStyle = {
    '--cut-from-end-percent': `${cutFromEndPercent}%`,
  } as CSSProperties

  return (
    <section className="time-slider" aria-label="Trim end preview">
      <label className="time-slider-control">
        <span className="time-slider-header">
          <span>Trim end preview</span>
          <strong>
            {formatPreviewDuration(trimEndDurationSec)} / {formatPreviewDuration(durationSec)}
          </strong>
        </span>
        <input
          type="range"
          min={0}
          max={durationSec}
          step={1}
          value={trimEndDurationSec}
          style={sliderStyle}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
    </section>
  )
}
