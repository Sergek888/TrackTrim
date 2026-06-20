import './Spinner.css'

type SpinnerProps = {
  size?: number
  label?: string
  className?: string
}

export default function Spinner({ size = 15, label, className }: SpinnerProps) {
  const classes = ['spinner']

  if (className) {
    classes.push(className)
  }

  return (
    <span
      className={classes.join(' ')}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label ?? 'Loading'}
    />
  )
}
