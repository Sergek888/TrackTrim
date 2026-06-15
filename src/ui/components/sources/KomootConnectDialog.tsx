import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { KomootConnectionState } from '../../../application/KomootConnectionService'

type KomootConnectDialogProps = {
  onCancel: () => void
  onConnect: (email: string, password: string) => Promise<KomootConnectionState>
  onConnected: () => void
}

export default function KomootConnectDialog({
  onCancel,
  onConnect,
  onConnected,
}: KomootConnectDialogProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const connection = await onConnect(email.trim(), password)

      if (!connection.connected) {
        setErrorMessage(
          connection.status === 'error'
            ? connection.error
            : 'Komoot authorization failed.',
        )
        return
      }

      onConnected()
    } catch (error) {
      console.error('Komoot connection failed:', error)
      setErrorMessage('Komoot connection could not be completed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="add-source-dialog" aria-label="Connect Komoot" onSubmit={handleSubmit}>
        <header>
          <h2>Connect Komoot</h2>
          <button className="icon-button" type="button" aria-label="Close" onClick={onCancel}>
            <X aria-hidden="true" size={15} strokeWidth={2.2} />
          </button>
        </header>

        <p className="form-note">
          TrackTrim exchanges your Komoot email and password for an API session on the backend.
          The password is not stored after the connection is created.
        </p>

        <label>
          <span>Email</span>
          <input
            type="email"
            name="username"
            disabled={submitting}
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            name="password"
            disabled={submitting}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {errorMessage !== null && <p className="error-message">{errorMessage}</p>}

        <footer>
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="save-button" type="submit" disabled={submitting}>
            {submitting ? 'Connecting...' : 'Connect'}
          </button>
        </footer>
      </form>
    </div>
  )
}
