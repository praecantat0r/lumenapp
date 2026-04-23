import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, 'hex')

export function encryptToken(token: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptToken(stored: string): string {
  // Legacy rows: plaintext tokens contain no ':' separators
  if (!stored.includes(':')) return stored
  const [ivHex, tagHex, encHex] = stored.split(':')
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8')
}
