import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export type EncryptedKomootToken = {
  version: 1
  ciphertext: string
  iv: string
  tag: string
}

export function encryptKomootToken(apiToken: string, secret = sessionSecret()): EncryptedKomootToken {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv)
  const ciphertext = Buffer.concat([cipher.update(apiToken, 'utf8'), cipher.final()])
  return {
    version: 1,
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptKomootToken(
  encrypted: EncryptedKomootToken,
  secret = sessionSecret(),
): string {
  if (encrypted.version !== 1) {
    throw new Error('Komoot session encryption version is not supported.')
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(secret),
    Buffer.from(encrypted.iv, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

function sessionSecret(): string {
  const secret = process.env.KOMOOT_SESSION_SECRET
  if (secret === undefined || secret.length < 32) {
    throw new Error('KOMOOT_SESSION_SECRET must contain at least 32 characters.')
  }
  return secret
}

function encryptionKey(secret: string): Buffer {
  if (secret.length < 32) {
    throw new Error('KOMOOT_SESSION_SECRET must contain at least 32 characters.')
  }
  return createHash('sha256').update(secret, 'utf8').digest()
}
