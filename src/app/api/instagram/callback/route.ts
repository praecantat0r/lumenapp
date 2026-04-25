import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/token-crypto'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const rawState = searchParams.get('state') || ''
  const [stateNonce, from = 'settings'] = rawState.split('|')
  const error = searchParams.get('error')

  const errorRedirect = from === 'onboarding'
    ? '/dashboard/overview?ig_error=1'
    : '/dashboard/brand-brain?tab=settings&ig_error=1'

  // Verify CSRF nonce
  const cookieNonce = req.cookies.get('ig_oauth_nonce')?.value
  if (error || !code || !stateNonce || !cookieNonce || stateNonce !== cookieNonce) {
    return NextResponse.redirect(new URL(errorRedirect, process.env.NEXT_PUBLIC_APP_URL!))
  }

  // Get userId from the authenticated session, not from state
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL(errorRedirect, process.env.NEXT_PUBLIC_APP_URL!))
  }
  const userId = user.id

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

    // Exchange for long-lived token
    const llParams = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      access_token: tokenData.access_token,
    })
    const llRes = await fetch(`https://graph.instagram.com/access_token?${llParams.toString()}`)
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
      access_token: encryptToken(longLivedToken),
      token_expires_at: expiresAt,
    }, { onConflict: 'user_id' })

    const successRedirect = from === 'onboarding'
      ? '/dashboard/overview?ig_connected=1'
      : '/dashboard/brand-brain?tab=settings&ig_connected=1'
    const res = NextResponse.redirect(new URL(successRedirect, process.env.NEXT_PUBLIC_APP_URL!))
    res.cookies.delete('ig_oauth_nonce')
    return res
  } catch (err) {
    console.error('IG callback error:', err)
    const res = NextResponse.redirect(new URL(errorRedirect, process.env.NEXT_PUBLIC_APP_URL!))
    res.cookies.delete('ig_oauth_nonce')
    return res
  }
}
