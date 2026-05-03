import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  return role?.role === 'admin' ? user : null
}

const PAGE_SIZE = 24

export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get('page') || '0'))

  const supabase = createServiceClient()
  const { data, error, count } = await supabase
    .from('posts')
    .select('id, caption, render_url, created_at, featured_on_landing, user_id', { count: 'exact' })
    .not('render_url', 'is', null)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE })
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, featured } = await req.json()
  if (!id || typeof featured !== 'boolean') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('posts')
    .update({ featured_on_landing: featured })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
