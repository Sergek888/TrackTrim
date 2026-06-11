import { X } from 'lucide-react'
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
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="add-source-dialog settings-dialog" aria-label="Settings">
        <header>
          <h2>Settings</h2>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
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
