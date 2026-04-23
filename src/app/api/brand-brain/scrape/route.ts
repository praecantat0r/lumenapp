import { NextRequest, NextResponse } from 'next/server'
import { scrapeWebsite } from '@/lib/scraper'
import { createClient } from '@/lib/supabase/server'

const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { website_url } = await req.json()
  if (!website_url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(website_url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'HTTPS only' }, { status: 400 })
  }

  if (PRIVATE_IP.test(parsed.hostname)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await scrapeWebsite(website_url)
  return NextResponse.json(result)
}
