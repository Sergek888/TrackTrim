import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type {
  KomootConnectionService,
  KomootConnectionState,
} from '../../application/KomootConnectionService'
import KomootSourceCard from './sources/KomootSourceCard'

type SettingsDialogProps = {
  komootConnection: KomootConnectionState
  onClose: () => void
  onKomootConnect: KomootConnectionService['connect']
  onKomootDisconnect: KomootConnectionService['disconnect']
}

export default function SettingsDialog({
  komootConnection,
  onClose,
  onKomootConnect,
  onKomootDisconnect,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement

    if (dialog === null) {
      return
    }

    dialog.showModal()
    closeButtonRef.current?.focus()

    return () => {
      if (dialog.open) {
        dialog.close()
      }

      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="dialog-backdrop"
      aria-label="Settings"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="add-source-dialog settings-dialog">
        <header>
          <h2>Settings</h2>
          <button ref={closeButtonRef} className="icon-button" type="button" aria-label="Close settings" title="Close" onClick={onClose}>
            <X aria-hidden="true" size={15} strokeWidth={2.2} />
          </button>
        </header>

        <section className="settings-section">
          <h3>Connections</h3>
          <KomootSourceCard
            connection={komootConnection}
            onConnect={onKomootConnect}
            onDisconnect={onKomootDisconnect}
          />
        </section>
      </section>
    </dialog>
  )
}
