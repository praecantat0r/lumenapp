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
      // Delete Instagram connection data for this Facebook user
      // We match on instagram_user_id since that's what we store
      const supabase = await createClient()
      await supabase
        .from('instagram_connections')
        .delete()
        .eq('instagram_user_id', facebookUserId)
    }

    const confirmationCode = `lumen-del-${facebookUserId}-${Date.now()}`
    const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL}/landing/privacy`

    return NextResponse.json({ url: statusUrl, confirmation_code: confirmationCode })
  } catch {
    return NextResponse.json({ error: 'Processing failed' }, { status: 400 })
  }
}
