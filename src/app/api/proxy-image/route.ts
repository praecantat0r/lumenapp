import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })

  // Only allow fetching from our own Supabase project
  const allowed = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (!url.startsWith(allowed)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const res = await fetch(url)
  if (!res.ok) return new NextResponse('Fetch failed', { status: res.status })

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
