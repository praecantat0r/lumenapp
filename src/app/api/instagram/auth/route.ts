import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`ig-auth:${user.id}`, 10, 60_000)) return rateLimitResponse()

  const from = new URL(req.url).searchParams.get('from') || 'settings'
  const nonce = randomUUID()
  // State carries only the nonce and `from`; userId comes from the Supabase session on callback
  const state = `${nonce}|${from}`

  const authUrl = `https://www.instagram.com/oauth/authorize?` +
    `client_id=${process.env.INSTAGRAM_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL + '/api/instagram/callback')}` +
    `&scope=instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights` +
    `&response_type=code` +
    `&state=${encodeURIComponent(state)}`

  const res = NextResponse.redirect(authUrl)
  // Short-lived CSRF nonce — verified in the callback before processing
  res.cookies.set('ig_oauth_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
    path: '/',
  })
  return res
}
