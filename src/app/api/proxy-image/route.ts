import { NextRequest, NextResponse } from 'next/server'

const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url')
  if (!urlParam) return new NextResponse('Missing url', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(urlParam)
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  if (parsed.protocol !== 'https:') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  if (PRIVATE_IP.test(parsed.hostname)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const allowedHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname
  if (parsed.hostname !== allowedHost) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const res = await fetch(parsed.toString(), {
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) return new NextResponse('Fetch failed', { status: res.status })

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  if (!contentType.startsWith('image/')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
