import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/server'
import { refreshInstagramToken } from '@/lib/instagram'
import { rateLimit } from '@/lib/rate-limit'
import { decryptToken, encryptToken } from '@/lib/token-crypto'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!rateLimit('cron:refresh-tokens', 5, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = await createClient()

  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: connections } = await supabase
    .from('instagram_connections')
    .select('*')
    .lt('token_expires_at', sevenDaysFromNow)

  if (!connections?.length) return NextResponse.json({ refreshed: 0 })

  let refreshed = 0
  for (const conn of connections) {
    try {
      const { access_token, expires_in } = await refreshInstagramToken(decryptToken(conn.access_token))
      const newExpiry = new Date(Date.now() + expires_in * 1000).toISOString()
      await supabase.from('instagram_connections').update({
        access_token: encryptToken(access_token),
        token_expires_at: newExpiry,
      }).eq('id', conn.id)
      refreshed++
    } catch (err) {
      console.error(`Token refresh failed for connection ${conn.id}:`, err)
    }
  }

  return NextResponse.json({ refreshed })
}
