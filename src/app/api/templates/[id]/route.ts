import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { renderPostServer } from '@/lib/renderer'

const TemplatePatchSchema = z.object({
  name:               z.string().min(1).max(200).optional(),
  canvas_json:        z.record(z.unknown()).optional(),
  width:              z.number().int().min(100).max(5000).optional(),
  height:             z.number().int().min(100).max(5000).optional(),
  thumbnail_url:      z.string().url().optional(),
  description:        z.string().max(1000).optional(),
  category:           z.string().max(100).optional(),
  use_for_generation: z.boolean().optional(),
})

export const maxDuration = 60

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = TemplatePatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('templates')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[template PATCH] update error', { id, userId: user.id, error: error.message, code: error.code })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If canvas_json changed, re-render all linked posts and update thumbnail.
  // Render uses the template directly (canvas_overrides: {}) — the template IS
  // the source of truth so no extra overrides are needed.
  if (parsed.data.canvas_json) {
    let thumbnail_url: string | null = null

    // Re-render all editable linked posts (pending_review or approved)
    const { data: linkedPosts } = await supabase
      .from('posts')
      .select('id, canvas_overrides')
      .eq('template_id', id)
      .in('status', ['pending_review', 'approved'])

    if (linkedPosts?.length) {
      const results = await Promise.allSettled(linkedPosts.map(async (post: { id: string; canvas_overrides: unknown }) => {
        const { render_url } = await renderPostServer({ template_id: id, canvas_overrides: {} })
        // Derive canvas_overrides from the new template objects so they stay in sync
        const canvas_overrides: Record<string, Record<string, unknown>> = {}
        for (const obj of (parsed.data.canvas_json as { objects?: Array<{ lumenId?: string }> }).objects ?? []) {
          if (obj.lumenId) canvas_overrides[obj.lumenId] = obj
        }
        await supabase.from('posts').update({ render_url, canvas_overrides }).eq('id', post.id)
        return render_url
      }))
      const first = results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<string> | undefined
      thumbnail_url = first?.value ?? null
    }

    // If no linked posts, render the template itself for the thumbnail
    if (!thumbnail_url) {
      try {
        const { render_url } = await renderPostServer({ template_id: id, canvas_overrides: {} })
        thumbnail_url = render_url
      } catch (err) {
        console.error('[template PATCH] thumbnail render failed:', err)
      }
    }

    // Save updated thumbnail back to template
    if (thumbnail_url) {
      await supabase.from('templates').update({ thumbnail_url }).eq('id', id)
      data.thumbnail_url = thumbnail_url
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('templates')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
