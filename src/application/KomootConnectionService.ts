import { KomootApiClient } from '../komoot/KomootApiClient'
import type { KomootApi, KomootRequestTransport } from '../komoot/KomootApi'

export type KomootConnectionState =
  | {
      readonly status: 'disconnected'
      readonly connected: false
    }
  | {
      readonly status: 'connected'
      readonly connected: true
      readonly userId: string
      readonly displayName: string | null
    }
  | {
      readonly status: 'expired'
      readonly connected: false
      readonly expired: true
    }
  | {
      readonly status: 'error'
      readonly connected: false
      readonly error: string
    }

type KomootConnectionPayload = {
  connected?: boolean
  expired?: boolean
  userId?: string
  displayName?: string | null
  error?: string
}

type Listener = () => void

export class KomootConnectionService {
  public state: KomootConnectionState = {
    status: 'disconnected',
    connected: false,
  }

  private readonly listeners = new Set<Listener>()

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  public async initialize(): Promise<KomootConnectionState> {
    return this.refresh()
  }

  public async refresh(): Promise<KomootConnectionState> {
    try {
      const response = await fetch('/api/komoot/status')
      const payload = await this.readPayload(response)

      if (!response.ok) {
        return this.setError(payload.error ?? 'Komoot status could not be checked.')
      }

      return this.setState(this.stateFromPayload(payload))
    } catch (error) {
      console.error('Komoot status check failed:', error)
      return this.setError('Komoot status could not be checked.')
    }
  }

  public async connect(email: string, password: string): Promise<KomootConnectionState> {
    try {
      const response = await fetch('/api/komoot/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await this.readPayload(response)

      if (!response.ok || payload.connected !== true) {
        return this.setError(payload.error ?? 'Komoot authorization failed.')
      }

      return this.setState(this.stateFromPayload(payload))
    } catch (error) {
      console.error('Komoot login request failed:', error)
      return this.setError('Komoot connection could not be completed.')
    }
  }

  public async disconnect(): Promise<KomootConnectionState> {
    try {
      const response = await fetch('/api/komoot/logout', { method: 'POST' })

      if (!response.ok) {
        const payload = await this.readPayload(response)

        return this.setError(payload.error ?? 'Komoot could not be disconnected.')
      }

      return this.setState({
        status: 'disconnected',
        connected: false,
      })
    } catch (error) {
      console.error('Komoot logout failed:', error)
      return this.setError('Komoot could not be disconnected.')
    }
  }

  public publicApi(): KomootApi {
    return new KomootApiClient()
  }

  public accountApi(): KomootApi {
    if (!this.state.connected) {
      throw new Error('Connect Komoot before loading account tours.')
    }

    return new KomootApiClient({
      transport: komootProxyTransport,
      onAuthorizationExpired: () => this.markExpired(),
    })
  }

  private stateFromPayload(payload: KomootConnectionPayload): KomootConnectionState {
    if (
      payload.connected === true &&
      typeof payload.userId === 'string' &&
      payload.userId !== ''
    ) {
      return {
        status: 'connected',
        connected: true,
        userId: payload.userId,
        displayName: payload.displayName ?? null,
      }
    }

    if (payload.expired === true) {
      return {
        status: 'expired',
        connected: false,
        expired: true,
      }
    }

    if (payload.error !== undefined) {
      return {
        status: 'error',
        connected: false,
        error: payload.error,
      }
    }

    return {
      status: 'disconnected',
      connected: false,
    }
  }

  private async readPayload(response: Response): Promise<KomootConnectionPayload> {
    return await response.json() as KomootConnectionPayload
  }

  private markExpired(): void {
    this.setState({
      status: 'expired',
      connected: false,
      expired: true,
    })
  }

  private setError(error: string): KomootConnectionState {
    return this.setState({
      status: 'error',
      connected: false,
      error,
    })
  }

  private setState(state: KomootConnectionState): KomootConnectionState {
    this.state = state

    for (const listener of this.listeners) {
      listener()
    }

    return state
  }
}

const komootProxyTransport: KomootRequestTransport = ({
  method,
  path,
  query,
  accept,
}) => fetch('/api/komoot/proxy', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    method,
    path,
    query: query ?? {},
    accept,
  }),
})
