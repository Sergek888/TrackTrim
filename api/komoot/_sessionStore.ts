import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { KomootAuthSession } from '../../src/komoot/shared/KomootTypes.js'
import {
  decryptKomootToken,
  encryptKomootToken,
  type EncryptedKomootToken,
} from './_sessionCrypto.js'

export type StoredKomootSession = {
  sessionId: string
  email: string
  auth: KomootAuthSession
  createdAt: string
  updatedAt: string
}

type PersistedKomootSession = {
  version: 1
  sessionId: string
  email: string
  userId: string
  encryptedApiToken: EncryptedKomootToken
  displayName: string | null
  createdAt: string
  updatedAt: string
}

export interface KomootSessionStore {
  get(sessionId: string): Promise<StoredKomootSession | null>
  set(session: StoredKomootSession): Promise<void>
  delete(sessionId: string): Promise<void>
}

interface PersistedSessionStore {
  get(sessionId: string): Promise<unknown | null>
  set(session: PersistedKomootSession): Promise<void>
  delete(sessionId: string): Promise<void>
}

class EncryptedKomootSessionStore implements KomootSessionStore {
  public constructor(private readonly store: PersistedSessionStore) {}

  public async get(sessionId: string): Promise<StoredKomootSession | null> {
    const raw = await this.store.get(sessionId)
    if (!isPersistedSession(raw)) {
      return null
    }

    try {
      return {
        sessionId: raw.sessionId,
        email: raw.email,
        auth: {
          authMode: 'basic-token',
          userId: raw.userId,
          apiToken: decryptKomootToken(raw.encryptedApiToken),
          displayName: raw.displayName,
        },
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      }
    } catch {
      return null
    }
  }

  public set(session: StoredKomootSession): Promise<void> {
    return this.store.set({
      version: 1,
      sessionId: session.sessionId,
      email: session.email,
      userId: session.auth.userId,
      encryptedApiToken: encryptKomootToken(session.auth.apiToken),
      displayName: session.auth.displayName,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })
  }

  public delete(sessionId: string): Promise<void> {
    return this.store.delete(sessionId)
  }
}

const memorySessions = new Map<string, PersistedKomootSession>()

class MemorySessionStore implements PersistedSessionStore {
  public async get(sessionId: string): Promise<unknown | null> {
    return memorySessions.get(sessionId) ?? null
  }
  public async set(session: PersistedKomootSession): Promise<void> {
    memorySessions.set(session.sessionId, session)
  }
  public async delete(sessionId: string): Promise<void> {
    memorySessions.delete(sessionId)
  }
}

class FileSessionStore implements PersistedSessionStore {
  private readonly directory = join(tmpdir(), 'tracktrim-komoot-sessions')

  public async get(sessionId: string): Promise<unknown | null> {
    try {
      return JSON.parse(await readFile(this.sessionPath(sessionId), 'utf8')) as unknown
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return null
      }
      throw error
    }
  }

  public async set(session: PersistedKomootSession): Promise<void> {
    await mkdir(this.directory, { recursive: true })
    const target = this.sessionPath(session.sessionId)
    const temporary = `${target}.${process.pid}.tmp`
    await writeFile(temporary, JSON.stringify(session), { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, target)
  }

  public async delete(sessionId: string): Promise<void> {
    await rm(this.sessionPath(sessionId), { force: true })
  }

  private sessionPath(sessionId: string): string {
    if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
      throw new Error('TrackTrim session id is invalid.')
    }
    return join(this.directory, `${sessionId}.json`)
  }
}

class UpstashSessionStore implements PersistedSessionStore {
  public constructor(private readonly baseUrl: string, private readonly token: string) {}

  public async get(sessionId: string): Promise<unknown | null> {
    const result = await this.command(['GET', keyForSession(sessionId)])
    return typeof result === 'string' ? JSON.parse(result) as unknown : null
  }
  public async set(session: PersistedKomootSession): Promise<void> {
    await this.command(['SET', keyForSession(session.sessionId), JSON.stringify(session), 'EX', String(60 * 60 * 24 * 90)])
  }
  public async delete(sessionId: string): Promise<void> {
    await this.command(['DEL', keyForSession(sessionId)])
  }

  private async command(command: readonly string[]): Promise<unknown> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(command),
    })
    if (!response.ok) {
      throw new Error('Komoot session storage request failed.')
    }
    const payload = await response.json() as { result?: unknown; error?: unknown }
    if (payload.error !== undefined && payload.error !== null) {
      throw new Error('Komoot session storage returned an error.')
    }
    return payload.result
  }
}

class UnsupportedStore implements PersistedSessionStore {
  public constructor(private readonly provider: string) {}
  public async get(): Promise<null> { throw this.error() }
  public async set(): Promise<void> { throw this.error() }
  public async delete(): Promise<void> { throw this.error() }
  private error(): Error {
    return new Error(`Komoot session store "${this.provider}" is not configured.`)
  }
}

export function getKomootSessionStore(): KomootSessionStore {
  const provider = process.env.KOMOOT_SESSION_STORE ?? defaultProvider()
  let store: PersistedSessionStore

  if (provider === 'file') {
    store = new FileSessionStore()
  } else if (provider === 'memory') {
    store = new MemorySessionStore()
  } else if (provider === 'vercel-kv') {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    store = url !== undefined && token !== undefined
      ? new UpstashSessionStore(url, token)
      : process.env.VERCEL === '1' ? new UnsupportedStore(provider) : new MemorySessionStore()
  } else if (provider === 'upstash-redis') {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    store = url !== undefined && token !== undefined
      ? new UpstashSessionStore(url, token)
      : new UnsupportedStore(provider)
  } else {
    store = new UnsupportedStore(provider)
  }

  return new EncryptedKomootSessionStore(store)
}

export function isPersistedSession(value: unknown): value is PersistedKomootSession {
  return typeof value === 'object' && value !== null &&
    'version' in value && value.version === 1 &&
    'encryptedApiToken' in value && typeof value.encryptedApiToken === 'object'
}

function defaultProvider(): string {
  return process.env.NODE_ENV === 'production' ? 'vercel-kv' : 'file'
}

function keyForSession(sessionId: string): string {
  return `tracktrim:komoot-session:${sessionId}`
}

function isFileNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
