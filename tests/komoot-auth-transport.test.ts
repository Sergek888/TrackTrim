import assert from 'node:assert/strict'
import test from 'node:test'
import { parseLoginResponse } from '../src/komoot/auth/KomootPasswordAuth'
import {
  KomootAuthError,
  KomootNotFoundError,
  KomootRateLimitError,
} from '../src/komoot/transport/KomootErrors'
import { basicAuthHeader, KomootHttpClient } from '../src/komoot/transport/KomootHttpClient'

test('parses login response and builds Basic authorization', () => {
  assert.deepEqual(parseLoginResponse({
    username: '123',
    password: 'token',
    user: { display_name: 'Rider' },
  }), {
    authMode: 'basic-token',
    userId: '123',
    apiToken: 'token',
    displayName: 'Rider',
  })
  assert.equal(basicAuthHeader('user', 'pass'), 'Basic dXNlcjpwYXNz')
  assert.throws(() => parseLoginResponse({ username: '123' }))
})

for (const [status, ErrorType] of [
  [401, KomootAuthError],
  [403, KomootAuthError],
  [404, KomootNotFoundError],
  [429, KomootRateLimitError],
] as const) {
  test(`maps HTTP ${status} to a typed error`, async () => {
    const client = new KomootHttpClient({
      fetch: async () => new Response('', { status }),
    })
    await assert.rejects(() => client.getJson('/tours/1'), ErrorType)
  })
}

test('rejects absolute paths', async () => {
  const client = new KomootHttpClient({ fetch: async () => new Response('{}') })
  await assert.rejects(() => client.getJson('https://example.com/tours/1'))
})

test('invokes the default fetch without binding it to the client instance', async () => {
  const originalFetch = globalThis.fetch
  let receiver: unknown

  globalThis.fetch = function (this: unknown) {
    receiver = this
    return Promise.resolve(new Response('{}', {
      headers: { 'content-type': 'application/json' },
    }))
  }

  try {
    await new KomootHttpClient().getJson('/tours/1')
    assert.equal(receiver, undefined)
  } finally {
    globalThis.fetch = originalFetch
  }
})
