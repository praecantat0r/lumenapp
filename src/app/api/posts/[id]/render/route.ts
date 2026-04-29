import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/server'
import { renderPostServer } from '@/lib/renderer'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { canvas_overrides } = await req.json()

  const { data: post, error: postErr } = await supabase
    .from('posts')
    .select('id, template_id, user_id')
    .eq('id', id)
    .single()

  if (postErr || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (post.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!post.template_id) return NextResponse.json({ error: 'Post has no template_id' }, { status: 400 })

  const { render_url } = await renderPostServer({
    template_id: post.template_id,
    canvas_overrides,
  })

  await supabase.from('posts').update({
    canvas_overrides,
    render_url,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ render_url })
}
