import { Unplug, Wifi, WifiOff } from 'lucide-react'
import { useState } from 'react'
import KomootConnectDialog, { type KomootConnection } from './KomootConnectDialog'

type KomootSourceCardProps = {
  connection: KomootConnection
  onConnected: (connection: KomootConnection) => void
  onDisconnected: () => void
}

export default function KomootSourceCard({
  connection,
  onConnected,
  onDisconnected,
}: KomootSourceCardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)

  async function handleLogout(): Promise<void> {
    try {
      await fetch('/api/komoot/logout', { method: 'POST' })
      setErrorMessage(null)
      onDisconnected()
    } catch {
      setErrorMessage('Komoot could not be disconnected.')
    }
  }

  const userLabel = connection.displayName ?? connection.userId ?? 'Connected'
  const connectionLabel = connection.connected
    ? userLabel
    : connection.expired
      ? 'Connection expired'
      : connection.error ?? 'Not connected'

  return (
    <section className="komoot-connection-row">
      <div className="komoot-connection-status">
        {connection.connected ? (
          <Wifi aria-hidden="true" size={17} strokeWidth={2.3} />
        ) : (
          <WifiOff aria-hidden="true" size={17} strokeWidth={2.3} />
        )}
        <div>
          <h2>Komoot</h2>
          <p title={connectionLabel}>{connectionLabel}</p>
        </div>
      </div>

      {connection.connected ? (
        <button className="secondary-button" type="button" onClick={() => void handleLogout()}>
          <Unplug aria-hidden="true" size={15} strokeWidth={2.2} />
          Disconnect
        </button>
      ) : (
        <button className="secondary-button" type="button" onClick={() => setConnectDialogOpen(true)}>
          Connect
        </button>
      )}

      {errorMessage !== null && <p className="error-message">{errorMessage}</p>}

      {connectDialogOpen && (
        <KomootConnectDialog
          onCancel={() => setConnectDialogOpen(false)}
          onConnected={(nextConnection) => {
            setConnectDialogOpen(false)
            setErrorMessage(null)
            onConnected(nextConnection)
          }}
        />
      )}
    </section>
  )
}
