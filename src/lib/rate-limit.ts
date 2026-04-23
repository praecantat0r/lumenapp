import { LRUCache } from 'lru-cache'

const store = new LRUCache<string, number[]>({ max: 10_000 })

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (store.get(key) ?? []).filter(t => now - t < windowMs)
  if (hits.length >= maxRequests) return false
  store.set(key, [...hits, now])
  return true
}

export function rateLimitResponse() {
  return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
}
