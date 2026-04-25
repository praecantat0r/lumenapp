import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@/lib/supabase/server'

function parseSignedRequest(signedRequest: string, secret: string) {
  const [encodedSig, payload] = signedRequest.split('.')
  const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  const expected = createHmac('sha256', secret).update(payload).digest()
  if (!sig.equals(expected)) throw new Error('Invalid signature')
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
}

// Called by Meta when a user removes Lumen from their Instagram connected-apps settings.
// This differs from data-deletion: we only revoke the connection, not all user data.
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData()
    const signedRequest = body.get('signed_request') as string
    if (!signedRequest) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
    }

    const data = parseSignedRequest(signedRequest, process.env.INSTAGRAM_APP_SECRET!)
    const instagramUserId: string = data.user_id ?? data.user?.id

    if (instagramUserId) {
      const supabase = await createClient()
      await supabase
        .from('instagram_connections')
        .delete()
        .eq('instagram_user_id', instagramUserId)
    }

    return new NextResponse(null, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Processing failed' }, { status: 400 })
  }
}
