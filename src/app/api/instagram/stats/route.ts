import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInstagramStats } from '@/lib/instagram'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: igConn } = await supabase
    .from('instagram_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!igConn) return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })

  const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
  const until = Math.floor(Date.now() / 1000)

  try {
    const stats = await getInstagramStats(igConn.instagram_user_id, igConn.access_token, since, until)
    return NextResponse.json(stats)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Stats fetch failed' }, { status: 500 })
  }
}
