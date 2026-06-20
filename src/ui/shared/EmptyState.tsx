import type { ReactNode } from 'react'
import './EmptyState.css'

type EmptyStateProps = {
  heading?: string
  children?: ReactNode
  variant?: 'default' | 'compact'
  className?: string
}

export default function EmptyState({
  heading,
  children,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const classes = ['empty-state']

  if (variant === 'compact') {
    classes.push('empty-state--compact')
  }

  if (className) {
    classes.push(className)
  }

  return (
    <section className={classes.join(' ')}>
      {heading !== undefined && <h2>{heading}</h2>}
      {children}
    </section>
  )
}
