import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`ig-auth:${user.id}`, 10, 60_000)) return rateLimitResponse()

  const from = new URL(req.url).searchParams.get('from') || 'settings'
  const state = `${user.id}|${from}`

  const authUrl = `https://www.instagram.com/oauth/authorize?` +
    `client_id=${process.env.INSTAGRAM_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL + '/api/instagram/callback')}` +
    `&scope=instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights` +
    `&response_type=code` +
    `&state=${encodeURIComponent(state)}`

  return NextResponse.redirect(authUrl)
}
