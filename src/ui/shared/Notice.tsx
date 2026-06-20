import type { ReactNode } from 'react'
import './Notice.css'

type NoticeVariant = 'error' | 'warning' | 'info' | 'success'

type NoticeProps = {
  variant: NoticeVariant
  children: ReactNode
  className?: string
  role?: 'alert' | 'status'
  panel?: boolean
  alert?: boolean
}

export default function Notice({
  variant,
  children,
  className,
  role,
  panel = false,
  alert = false,
}: NoticeProps) {
  const classes = ['notice', `notice--${variant}`]

  if (panel) {
    classes.push('notice--panel')
  }

  if (alert) {
    classes.push('notice--alert')
  }

  if (className) {
    classes.push(className)
  }

  const resolvedRole = role ?? (variant === 'error' ? 'alert' : 'status')

  return (
    <p className={classes.join(' ')} role={resolvedRole}>
      {children}
    </p>
  )
}
