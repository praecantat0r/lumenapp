import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''

  const isRootDomain =
    hostname === 'lumen-reach.com' ||
    hostname === 'www.lumen-reach.com'

  if (isRootDomain) {
    const url = request.nextUrl.clone()
    if (url.pathname.startsWith('/landing')) {
      return NextResponse.next()
    }
    url.pathname = '/landing'
    return NextResponse.rewrite(url)
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)',
  ],
}
