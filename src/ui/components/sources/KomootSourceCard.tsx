import { RefreshCw, Unplug, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  KomootTrackSource,
  type KomootUserListType,
} from '../../../application/sources/KomootTrackSource'
import type { TrackSource } from '../../../application/sources/TrackSource'
import { defaultTrackColor } from '../../trackColors'
import KomootConnectDialog, { type KomootConnection } from './KomootConnectDialog'
import KomootImportDialog from './KomootImportDialog'

type KomootSourceState = 'not_connected' | 'connecting' | 'connected' | 'expired' | 'error'

type KomootSourceCardProps = {
  sourceIndex: number
  onCreateSource: (source: TrackSource) => void
}

export default function KomootSourceCard({
  sourceIndex,
  onCreateSource,
}: KomootSourceCardProps) {
  const [state, setState] = useState<KomootSourceState>('not_connected')
  const [connection, setConnection] = useState<KomootConnection | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  useEffect(() => {
    void checkStatus(false)
  }, [])

  async function checkStatus(showLoading: boolean): Promise<void> {
    if (showLoading) {
      setState('connecting')
    }

    try {
      const response = await fetch('/api/komoot/status')
      const payload = (await response.json()) as KomootConnection

      if (payload.connected) {
        setConnection(payload)
        setState('connected')
        setErrorMessage(null)
        return
      }

      if (payload.expired) {
        setState('expired')
        setConnection(null)
        return
      }

      setState('not_connected')
      setConnection(null)
    } catch {
      setState('error')
      setErrorMessage('Komoot status could not be checked.')
    }
  }

  async function handleLogout(): Promise<void> {
    await fetch('/api/komoot/logout', { method: 'POST' })
    setConnection(null)
    setState('not_connected')
  }

  function handleConnected(nextConnection: KomootConnection): void {
    setConnection(nextConnection)
    setState('connected')
    setConnectDialogOpen(false)
  }

  function createUserSource(listType: KomootUserListType): void {
    const userId = connection?.userId

    if (userId === undefined) {
      return
    }

    const label = listType === 'planned' ? 'planned' : 'completed'
    const source = new KomootTrackSource(
      userId,
      `${connection?.displayName ?? 'Komoot'} ${label}`,
      defaultTrackColor(sourceIndex),
      listType,
      { kind: 'tracktrim-session' },
    )

    source.order = sourceIndex
    onCreateSource(source)
  }

  const userLabel =
    connection?.displayName ?? connection?.userId ?? 'Komoot connected'

  return (
    <section className={`komoot-source-card komoot-source-card-${state}`}>
      <header>
        <div>
          <h2>Komoot</h2>
          <p>{labelForState(state, userLabel, errorMessage)}</p>
        </div>
        {state === 'connected' ? (
          <Wifi aria-hidden="true" size={18} strokeWidth={2.3} />
        ) : (
          <WifiOff aria-hidden="true" size={18} strokeWidth={2.3} />
        )}
      </header>

      {state === 'not_connected' && (
        <>
          <p className="form-note">
            You need to sign in to Komoot. Password is not saved, only the backend session is stored.
          </p>
          <button className="save-button" type="button" onClick={() => setConnectDialogOpen(true)}>
            Connect Komoot
          </button>
        </>
      )}

      {state === 'connected' && (
        <div className="komoot-source-actions">
          <button className="secondary-button" type="button" onClick={() => void checkStatus(true)}>
            <Wifi aria-hidden="true" size={15} strokeWidth={2.2} />
            Check
          </button>
          <button className="secondary-button" type="button" onClick={() => setImportDialogOpen(true)}>
            <RefreshCw aria-hidden="true" size={15} strokeWidth={2.2} />
            Refresh
          </button>
          <button className="secondary-button" type="button" onClick={() => createUserSource('recorded')}>
            Import completed
          </button>
          <button className="secondary-button" type="button" onClick={() => createUserSource('planned')}>
            Import planned
          </button>
          <button className="secondary-button" type="button" onClick={() => setImportDialogOpen(true)}>
            Import tour URL
          </button>
          <button className="secondary-button" type="button" onClick={() => setImportDialogOpen(true)}>
            Import collection URL
          </button>
          <button className="secondary-button" type="button" onClick={() => void handleLogout()}>
            <Unplug aria-hidden="true" size={15} strokeWidth={2.2} />
            Disconnect
          </button>
        </div>
      )}

      {state === 'expired' && (
        <>
          <p className="error-message">Komoot session expired, reconnect required.</p>
          <button className="save-button" type="button" onClick={() => setConnectDialogOpen(true)}>
            Reconnect
          </button>
        </>
      )}

      {state === 'error' && (
        <button className="secondary-button" type="button" onClick={() => void checkStatus(true)}>
          Retry
        </button>
      )}

      {connectDialogOpen && (
        <KomootConnectDialog
          onCancel={() => setConnectDialogOpen(false)}
          onConnected={handleConnected}
        />
      )}

      {importDialogOpen && connection?.userId !== undefined && (
        <KomootImportDialog
          sourceIndex={sourceIndex}
          userId={connection.userId}
          displayName={connection.displayName ?? null}
          onCancel={() => setImportDialogOpen(false)}
          onCreateSource={(source) => {
            setImportDialogOpen(false)
            onCreateSource(source)
          }}
        />
      )}
    </section>
  )
}

function labelForState(
  state: KomootSourceState,
  userLabel: string,
  errorMessage: string | null,
): string {
  if (state === 'connected') {
    return userLabel
  }

  if (state === 'connecting') {
    return 'Checking connection...'
  }

  if (state === 'expired') {
    return 'Komoot session expired'
  }

  if (state === 'error') {
    return errorMessage ?? 'Komoot connection error'
  }

  return 'Not connected'
}
