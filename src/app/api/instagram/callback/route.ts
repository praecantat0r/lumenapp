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
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
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
    if (!tokenData.access_token) throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`)

    const igUserId = tokenData.user_id?.toString()
    if (!igUserId) throw new Error(`No user_id in token response: ${JSON.stringify(tokenData)}`)

    // Exchange for long-lived token (60 days)
    const llRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${tokenData.access_token}`
    )
    const llData = await llRes.json()
    if (!llData.access_token) {
      throw new Error(`Long-lived token exchange failed: ${JSON.stringify(llData)}`)
    }
    const longLivedToken = llData.access_token
    // Get Instagram username — try /me first, fall back to /{id}
    let username: string | undefined
    for (const url of [
      `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${longLivedToken}`,
      `https://graph.instagram.com/v21.0/${igUserId}?fields=id,username&access_token=${longLivedToken}`,
    ]) {
      const r = await fetch(url)
      const d = await r.json()
      if (d.username) { username = d.username; break }
      console.warn('IG profile fetch:', JSON.stringify(d))
    }

    const expiresInSeconds: number = llData.expires_in ?? (60 * 24 * 60 * 60)
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    await supabase.from('instagram_connections').upsert({
      user_id: userId,
      instagram_user_id: igUserId,
      username,
      access_token: longLivedToken,
      token_expires_at: expiresAt,
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
