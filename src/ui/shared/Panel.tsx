import type { ReactNode, MouseEvent } from 'react'
import IconButton from './IconButton'
import { X } from 'lucide-react'
import './Panel.css'
import './Surface.css'

type PanelProps = {
  title: string
  ariaLabel?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
  closeLabel?: string
}

export default function Panel({
  title,
  ariaLabel,
  onClose,
  children,
  footer,
  className,
  closeLabel = 'Close',
}: PanelProps) {
  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const panelClasses = ['surface', 'panel-content']

  if (className) {
    panelClasses.push(className)
  }

  return (
    <div
      className="panel-backdrop"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className={panelClasses.join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
      >
        <header className="panel-header">
          <h2>{title}</h2>
          <IconButton
            type="button"
            aria-label={closeLabel}
            title={closeLabel}
            onClick={onClose}
          >
            <X aria-hidden="true" size={15} strokeWidth={2.2} />
          </IconButton>
        </header>
        <div className="panel-body">
          {children}
        </div>
        {footer !== undefined && <footer className="panel-footer">{footer}</footer>}
      </div>
    </div>
  )
}
