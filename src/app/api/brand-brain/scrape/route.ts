import { NextRequest, NextResponse } from 'next/server'
import { scrapeWebsite } from '@/lib/scraper'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`scrape:${user.id}`, 5, 60_000)) return rateLimitResponse()

  const { website_url } = await req.json()
  if (!website_url) return NextResponse.json({ error: 'URL required' }, { status: 400 })
  const result = await scrapeWebsite(website_url)
  return NextResponse.json(result)
}
