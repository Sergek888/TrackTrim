import { Unplug, Wifi, WifiOff } from 'lucide-react'
import { useState } from 'react'
import type { KomootConnectionState } from '../../../application/KomootConnectionService'
import KomootConnectDialog from './KomootConnectDialog'

type KomootSourceCardProps = {
  connection: KomootConnectionState
  onConnect: (email: string, password: string) => Promise<KomootConnectionState>
  onDisconnect: () => Promise<KomootConnectionState>
}

export default function KomootSourceCard({
  connection,
  onConnect,
  onDisconnect,
}: KomootSourceCardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)

  async function handleLogout(): Promise<void> {
    try {
      const nextConnection = await onDisconnect()

      setErrorMessage(
        nextConnection.status === 'error' ? nextConnection.error : null,
      )
    } catch {
      setErrorMessage('Komoot could not be disconnected.')
    }
  }

  const userLabel = connection.connected
    ? connection.displayName ?? connection.userId
    : 'Connected'
  const connectionLabel = connection.connected
    ? userLabel
    : connection.status === 'expired'
      ? 'Connection expired'
      : connection.status === 'error'
        ? connection.error
        : 'Not connected'

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
          onConnect={onConnect}
          onCancel={() => setConnectDialogOpen(false)}
          onConnected={() => {
            setConnectDialogOpen(false)
            setErrorMessage(null)
          }}
        />
      )}
    </section>
  )
}
