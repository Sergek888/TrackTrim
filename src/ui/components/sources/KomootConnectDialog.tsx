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

type ConnectMode = 'password' | 'session'

export default function KomootConnectDialog({
  onCancel,
  onConnected,
}: KomootConnectDialogProps) {
  const [mode, setMode] = useState<ConnectMode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [kmtSess, setKmtSess] = useState('')
  const [kmtSessSig, setKmtSessSig] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const response = mode === 'password' ? await submitPasswordLogin() : await submitSessionLogin()
      const payload = (await response.json()) as KomootConnection

      if (!response.ok || !payload.connected) {
        setErrorMessage(
          payload.error ??
            'Komoot requires captcha. Use a valid captcha token or connect through session cookies in dev mode.',
        )
        return
      }

      onConnected(payload)
    } catch {
      setErrorMessage('Komoot connection could not be completed.')
    } finally {
      setSubmitting(false)
    }
  }

  function submitPasswordLogin(): Promise<Response> {
    return fetch('/api/komoot/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
        captcha: captcha.trim(),
      }),
    })
  }

  function submitSessionLogin(): Promise<Response> {
    return fetch('/api/komoot/manual-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kmtSess: kmtSess.trim(),
        kmtSessSig: kmtSessSig.trim(),
      }),
    })
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
          Password is not saved. TrackTrim stores only Komoot session cookies on the backend.
        </p>

        <div className="segmented-control" role="group" aria-label="Komoot connect mode">
          <button
            type="button"
            className={mode === 'password' ? 'is-selected' : ''}
            onClick={() => setMode('password')}
          >
            Email/password
          </button>
          <button
            type="button"
            className={mode === 'session' ? 'is-selected' : ''}
            onClick={() => setMode('session')}
          >
            Session cookies
          </button>
        </div>

        {mode === 'password' ? (
          <>
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

            <label>
              <span>Captcha token</span>
              <input
                type="text"
                name="captcha"
                autoComplete="off"
                value={captcha}
                placeholder="Manual token for MVP"
                onChange={(event) => setCaptcha(event.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <p className="form-note">
              Dev fallback: paste kmt_sess and kmt_sess.sig from an already logged-in Komoot browser session.
            </p>

            <label>
              <span>kmt_sess</span>
              <input
                type="password"
                autoComplete="off"
                value={kmtSess}
                onChange={(event) => setKmtSess(event.target.value)}
              />
            </label>

            <label>
              <span>kmt_sess.sig</span>
              <input
                type="password"
                autoComplete="off"
                value={kmtSessSig}
                onChange={(event) => setKmtSessSig(event.target.value)}
              />
            </label>
          </>
        )}

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

