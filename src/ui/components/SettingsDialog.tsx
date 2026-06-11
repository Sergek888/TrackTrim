import { X } from 'lucide-react'
import { useEffect } from 'react'
import KomootSourceCard from './sources/KomootSourceCard'
import type { KomootConnection } from './sources/KomootConnectDialog'

type SettingsDialogProps = {
  komootConnection: KomootConnection
  onClose: () => void
  onKomootConnected: (connection: KomootConnection) => void
  onKomootDisconnected: () => void
}

export default function SettingsDialog({
  komootConnection,
  onClose,
  onKomootConnected,
  onKomootDisconnected,
}: SettingsDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="add-source-dialog settings-dialog" role="dialog" aria-modal="true" aria-label="Settings">
        <header>
          <h2>Settings</h2>
          <button className="icon-button" type="button" aria-label="Close settings" title="Close" onClick={onClose}>
            <X aria-hidden="true" size={15} strokeWidth={2.2} />
          </button>
        </header>

        <section className="settings-section">
          <h3>Connections</h3>
          <KomootSourceCard
            connection={komootConnection}
            onConnected={onKomootConnected}
            onDisconnected={onKomootDisconnected}
          />
        </section>
      </section>
    </div>
  )
}
