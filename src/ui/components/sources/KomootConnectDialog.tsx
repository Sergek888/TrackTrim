import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'

export type KomootConnection = {
  connected: boolean
  expired?: boolean
  userId?: string
  displayName?: string | null
  error?: string
}

type KomootConnectDialogProps = {
  onCancel: () => void
  onConnected: (connection: KomootConnection) => void
}

export default function KomootConnectDialog({
  onCancel,
  onConnected,
}: KomootConnectDialogProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/komoot/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })
      const payload = (await response.json()) as KomootConnection

      if (!response.ok || !payload.connected) {
        setErrorMessage(payload.error ?? 'Komoot authorization failed.')
        return
      }

      onConnected(payload)
    } catch {
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
          Sign in with Komoot email and password. TrackTrim uses them only on the backend to request Komoot data.
        </p>

        <label>
          <span>Email</span>
          <input
            type="email"
            name="username"
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

