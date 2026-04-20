import { NextRequest, NextResponse } from 'next/server'
import { scrapeWebsite } from '@/lib/scraper'

export async function POST(req: NextRequest) {
  const { website_url } = await req.json()
  if (!website_url) return NextResponse.json({ error: 'URL required' }, { status: 400 })
  const result = await scrapeWebsite(website_url)
  return NextResponse.json(result)
}
