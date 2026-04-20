import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const rawState = searchParams.get('state') || ''
  const [userId, from] = rawState.split('|')
  const error = searchParams.get('error')

  const errorRedirect = from === 'onboarding'
    ? '/dashboard/overview?ig_error=1'
    : '/dashboard/brand-brain?tab=settings&ig_error=1'

  if (error || !code || !userId) {
    return NextResponse.redirect(new URL(errorRedirect, process.env.NEXT_PUBLIC_APP_URL!))
  }

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID!,
        client_secret: process.env.INSTAGRAM_APP_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: process.env.NEXT_PUBLIC_APP_URL! + '/api/instagram/callback',
        code,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('No access token in response')

    // Exchange for long-lived token
    const llRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_APP_ID}&client_secret=${process.env.INSTAGRAM_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    )
    const llData = await llRes.json()
    const longLivedToken = llData.access_token || tokenData.access_token

    // Get Instagram Business Account ID
    const pagesRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}&fields=instagram_business_account,name`
    )
    const pagesData = await pagesRes.json()
    const page = (pagesData.data || [])[0]
    const igAccountId = page?.instagram_business_account?.id

    if (!igAccountId) throw new Error('No Instagram Business Account found. Please ensure your Instagram is connected to a Facebook Page.')

    // Get IG username
    const igRes = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}?fields=username&access_token=${longLivedToken}`
    )
    const igData = await igRes.json()

    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days

    await supabase.from('instagram_connections').upsert({
      user_id: userId,
      instagram_user_id: igAccountId,
      username: igData.username,
      access_token: longLivedToken,
      token_expires_at: expiresAt,
      page_id: page?.id,
    }, { onConflict: 'user_id' })

    const successRedirect = from === 'onboarding'
      ? '/dashboard/overview?ig_connected=1'
      : '/dashboard/brand-brain?tab=settings&ig_connected=1'
    return NextResponse.redirect(new URL(successRedirect, process.env.NEXT_PUBLIC_APP_URL!))
  } catch (err) {
    console.error('IG callback error:', err)
    return NextResponse.redirect(new URL(errorRedirect, process.env.NEXT_PUBLIC_APP_URL!))
  }
}
