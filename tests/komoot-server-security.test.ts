import assert from 'node:assert/strict'
import test from 'node:test'
import { isAllowedKomootProxyRequest } from '../api/komoot/_proxyAllowlist'
import { decryptKomootToken, encryptKomootToken } from '../api/komoot/_sessionCrypto'
import { isPersistedSession } from '../api/komoot/_sessionStore'

const secret = '12345678901234567890123456789012'

test('proxy allows reads and rejects mutations and external URLs', () => {
  assert.equal(isAllowedKomootProxyRequest('GET', '/tours/123'), true)
  assert.equal(isAllowedKomootProxyRequest('GET', '/collections/123/compilation_lines/'), true)
  assert.equal(isAllowedKomootProxyRequest('POST', '/tours/'), false)
  assert.equal(isAllowedKomootProxyRequest('DELETE', '/tours/123'), false)
  assert.equal(isAllowedKomootProxyRequest('GET', 'https://example.com/tours/123'), false)
})

test('encrypts and authenticates Komoot tokens', () => {
  const encrypted = encryptKomootToken('api-token', secret)
  assert.notEqual(encrypted.ciphertext, 'api-token')
  assert.equal(decryptKomootToken(encrypted, secret), 'api-token')
  assert.throws(() => decryptKomootToken(encrypted, `${secret}x`))
})

test('rejects legacy plaintext session records', () => {
  assert.equal(isPersistedSession({
    sessionId: 'legacy',
    apiToken: 'plaintext',
  }), false)
})
