import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes = AES-256)
function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY
  if (!key || key.length !== 64) throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex chars')
  return Buffer.from(key, 'hex')
}

// Encrypted format: "enc:" + hex(iv[12] + tag[16] + ciphertext)
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return 'enc:' + Buffer.concat([iv, tag, encrypted]).toString('hex')
}

// Accepts both encrypted ("enc:..." hex) and legacy plaintext tokens
export function decryptToken(stored: string): string {
  if (!stored.startsWith('enc:')) return stored
  const buf = Buffer.from(stored.slice(4), 'hex')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}
