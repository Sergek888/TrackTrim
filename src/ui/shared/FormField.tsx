import type { ReactNode } from 'react'
import './FormField.css'

type FormFieldProps = {
  label: string
  note?: string | null
  error?: string | null
  children: ReactNode
  className?: string
}

export default function FormField({
  label,
  note,
  error,
  children,
  className,
}: FormFieldProps) {
  const classes = ['form-field']

  if (className) {
    classes.push(className)
  }

  return (
    <label className={classes.join(' ')}>
      <span>{label}</span>
      {children}
      {note !== undefined && note !== null && (
        <p className="form-note">{note}</p>
      )}
      {error !== undefined && error !== null && (
        <p className="form-error">{error}</p>
      )}
    </label>
  )
}
