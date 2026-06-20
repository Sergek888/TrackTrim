import { TRACK_COLORS } from '../trackColors'

type ColorPaletteProps = {
  left: number
  top: number
  value: string
  onChange: (color: string) => void
}

export default function ColorPalette({ left, top, value, onChange }: ColorPaletteProps) {
  const paletteWidth = 132
  const paletteHeight = 112
  const margin = 12
  const clampedLeft = Math.min(
    Math.max(margin, left),
    Math.max(margin, window.innerWidth - paletteWidth - margin),
  )
  const clampedTop = Math.min(
    Math.max(margin, top),
    Math.max(margin, window.innerHeight - paletteHeight - margin),
  )

  return (
    <div className="surface palette" style={{ left: clampedLeft, top: clampedTop }} aria-label="Color palette">
      {TRACK_COLORS.map((color) => (
        <button
          key={color}
          className="swatch"
          type="button"
          style={{ background: color }}
          aria-label={`Set color ${color}`}
          onClick={() => onChange(color)}
        />
      ))}
      <input
        type="color"
        value={value}
        aria-label="Custom color"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
