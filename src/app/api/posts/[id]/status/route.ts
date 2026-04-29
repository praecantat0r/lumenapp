import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data } = await supabase
    .from('posts')
    .select('id, status, render_url, caption, hashtags')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  return NextResponse.json(data || { status: 'not_found' })
}
