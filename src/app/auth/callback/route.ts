import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host = request.headers.get('host') ?? ''
  const base = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : `https://${host}`

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${base}${next}?verified=true`)
    }
    // Server exchange failed — pass code to client for fallback exchange
    return NextResponse.redirect(`${base}${next}?code=${encodeURIComponent(code)}`)
  }

  return NextResponse.redirect(`${base}/reset-password?error=invalid`)
}
