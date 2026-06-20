import './SegmentedControl.css'

type Segment = {
  value: string
  label: string
  disabled?: boolean
}

type SegmentedControlProps = {
  segments: readonly Segment[]
  value: string
  onChange: (value: string) => void
  columns?: 2 | 3
  ariaLabel?: string
  className?: string
}

export default function SegmentedControl({
  segments,
  value,
  onChange,
  columns = 2,
  ariaLabel,
  className,
}: SegmentedControlProps) {
  const classes = [
    'segmented-control',
    `segmented-control--columns-${columns}`,
  ]

  if (className) {
    classes.push(className)
  }

  return (
    <div
      className={classes.join(' ')}
      role="group"
      aria-label={ariaLabel}
    >
      {segments.map((segment) => (
        <button
          key={segment.value}
          type="button"
          className={value === segment.value ? 'is-selected' : ''}
          disabled={segment.disabled === true}
          onClick={() => onChange(segment.value)}
        >
          {segment.label}
        </button>
      ))}
    </div>
  )
}
