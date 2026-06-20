import { useRef, useState, type FormEvent } from 'react'
import type { KomootConnectionState } from '../../../application/KomootConnectionService'
import Button from '../../shared/Button'
import Dialog from '../../shared/Dialog'
import FormField from '../../shared/FormField'
import Notice from '../../shared/Notice'
import TextInput from '../../shared/TextInput'

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
  const emailInputRef = useRef<HTMLInputElement | null>(null)
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
    <Dialog
      title="Connect Komoot"
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            form="komoot-connect-form"
            disabled={submitting}
          >
            {submitting ? 'Connecting...' : 'Connect'}
          </Button>
        </>
      }
    >
      <p className="form-note">
        TrackViewer exchanges your Komoot email and password for an API session on the backend.
        The password is not stored after the connection is created.
      </p>

      <form
        id="komoot-connect-form"
        aria-label="Connect Komoot"
        onSubmit={handleSubmit}
      >
        <FormField label="Email">
          <TextInput
            ref={emailInputRef}
            type="email"
            name="username"
            disabled={submitting}
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>

        <FormField label="Password">
          <TextInput
            type="password"
            name="password"
            disabled={submitting}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormField>

        {errorMessage !== null && <Notice variant="error">{errorMessage}</Notice>}
      </form>
    </Dialog>
  )
}
