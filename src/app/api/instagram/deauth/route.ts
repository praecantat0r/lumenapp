import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

function parseSignedRequest(signedRequest: string, secret: string) {
  const [encodedSig, payload] = signedRequest.split('.')
  const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  const expected = createHmac('sha256', secret).update(payload).digest()
  if (!sig.equals(expected)) throw new Error('Invalid signature')
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData()
    const signedRequest = body.get('signed_request') as string
    if (!signedRequest) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
    }

    const data = parseSignedRequest(signedRequest, process.env.INSTAGRAM_APP_SECRET!)
    const facebookUserId: string = data.user?.id

    if (facebookUserId) {
      const supabase = createServiceClient()
      await supabase
        .from('instagram_connections')
        .update({ access_token: null, token_expires_at: null })
        .eq('instagram_user_id', facebookUserId)
    }

    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 200 })
  }
}
