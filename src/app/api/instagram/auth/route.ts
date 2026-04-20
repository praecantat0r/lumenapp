import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const from = new URL(req.url).searchParams.get('from') || 'settings'
  const state = `${user.id}|${from}`

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${process.env.INSTAGRAM_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL + '/api/instagram/callback')}` +
    `&scope=instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list` +
    `&response_type=code` +
    `&state=${encodeURIComponent(state)}`

  return NextResponse.redirect(authUrl)
}
