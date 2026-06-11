export type StoredKomootSession = {
  sessionId: string
  auth: {
    email: string
    password: string
  }
  userId: string | null
  displayName: string | null
  createdAt: string
  updatedAt: string
}

export interface KomootSessionStore {
  get(sessionId: string): Promise<StoredKomootSession | null>
  set(session: StoredKomootSession): Promise<void>
  delete(sessionId: string): Promise<void>
}

const memorySessions = new Map<string, StoredKomootSession>()

class MemoryKomootSessionStore implements KomootSessionStore {
  public async get(sessionId: string): Promise<StoredKomootSession | null> {
    return memorySessions.get(sessionId) ?? null
  }

  public async set(session: StoredKomootSession): Promise<void> {
    memorySessions.set(session.sessionId, session)
  }

  public async delete(sessionId: string): Promise<void> {
    memorySessions.delete(sessionId)
  }
}

class UpstashRestSessionStore implements KomootSessionStore {
  public constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  public async get(sessionId: string): Promise<StoredKomootSession | null> {
    const result = await this.command(['GET', keyForSession(sessionId)])

    if (typeof result !== 'string') {
      return null
    }

    return JSON.parse(result) as StoredKomootSession
  }

  public async set(session: StoredKomootSession): Promise<void> {
    await this.command([
      'SET',
      keyForSession(session.sessionId),
      JSON.stringify(session),
      'EX',
      String(60 * 60 * 24 * 90),
    ])
  }

  public async delete(sessionId: string): Promise<void> {
    await this.command(['DEL', keyForSession(sessionId)])
  }

  private async command(command: readonly string[]): Promise<unknown> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(command),
    })

    if (!response.ok) {
      throw new Error('Komoot session storage request failed.')
    }

    const payload = (await response.json()) as { result?: unknown; error?: unknown }

    if (payload.error !== undefined && payload.error !== null) {
      throw new Error('Komoot session storage returned an error.')
    }

    return payload.result
  }
}

class UnsupportedPersistentStore implements KomootSessionStore {
  public constructor(private readonly provider: string) {}

  public async get(): Promise<StoredKomootSession | null> {
    throw this.error()
  }

  public async set(): Promise<void> {
    throw this.error()
  }

  public async delete(): Promise<void> {
    throw this.error()
  }

  private error(): Error {
    return new Error(
      `Komoot session store "${this.provider}" is configured but not wired. Use KOMOOT_SESSION_STORE=vercel-kv with KV_REST_API_URL/KV_REST_API_TOKEN or provide an adapter for this provider.`,
    )
  }
}

export function getKomootSessionStore(): KomootSessionStore {
  const provider = process.env.KOMOOT_SESSION_STORE ?? defaultProvider()

  if (provider === 'vercel-kv') {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN

    if (url !== undefined && token !== undefined) {
      return new UpstashRestSessionStore(url, token)
    }

    return process.env.VERCEL === '1'
      ? new UnsupportedPersistentStore(provider)
      : new MemoryKomootSessionStore()
  }

  if (provider === 'upstash-redis') {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (url !== undefined && token !== undefined) {
      return new UpstashRestSessionStore(url, token)
    }
  }

  if (provider === 'postgres') {
    return new UnsupportedPersistentStore(provider)
  }

  return new MemoryKomootSessionStore()
}

function defaultProvider(): string {
  return process.env.VERCEL === '1' ? 'vercel-kv' : 'memory'
}

function keyForSession(sessionId: string): string {
  return `tracktrim:komoot-session:${sessionId}`
}
