import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { renderPostServer, SEED_CANVAS_JSON } from '@/lib/renderer'

export const maxDuration = 60

// Re-renders all pending_review posts using SEED coordinates (fixes coordinate corruption).
// Also resets the linked per-post template's canvas_json and thumbnail.
export async function POST() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, image_url, template_layers, generation_metadata, template_id')
    .eq('status', 'pending_review')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!posts?.length) return NextResponse.json({ fixed: 0 })

  let fixed = 0
  const errors: string[] = []

  for (const post of posts) {
    try {
      const layers = (post.template_layers ?? {}) as Record<string, string>
      const bbName = (post.generation_metadata as any)?.bb_snapshot?.brand_name ?? ''

      // Build canvas_overrides from SEED (correct coords + angle=0) + post content
      const canvas_overrides: Record<string, Record<string, unknown>> = {}
      for (const obj of SEED_CANVAS_JSON.objects) {
        if (!obj.lumenId) continue
        canvas_overrides[obj.lumenId] = { ...(obj as Record<string, unknown>), angle: 0 }
      }
      if (post.image_url) {
        canvas_overrides['background-image'] = { ...canvas_overrides['background-image'], src: post.image_url }
      }
      if (layers.title)      canvas_overrides['title']       = { ...canvas_overrides['title'],       text: layers.title }
      if (layers.subtitle)   canvas_overrides['subtitle']    = { ...canvas_overrides['subtitle'],    text: layers.subtitle }
      if (layers.cta)        canvas_overrides['cta']         = { ...canvas_overrides['cta'],         text: layers.cta }
      if (bbName)            canvas_overrides['brand-name']  = { ...canvas_overrides['brand-name'],  text: bbName }

      if (!post.template_id) continue

      // Re-render using the template_id (render route uses canvas_overrides which now have correct coords)
      const { render_url } = await renderPostServer({ template_id: post.template_id, canvas_overrides })

      // Update post render
      await supabase.from('posts').update({ render_url, canvas_overrides }).eq('id', post.id)

      // Rebuild per-post template canvas_json from SEED + overrides, update thumbnail
      const mergedObjects = SEED_CANVAS_JSON.objects.map(obj =>
        obj.lumenId && canvas_overrides[obj.lumenId as string]
          ? { ...obj, ...canvas_overrides[obj.lumenId as string] }
          : obj
      )
      const mergedCanvas = { ...SEED_CANVAS_JSON, objects: mergedObjects }
      await supabase.from('templates').update({
        canvas_json: mergedCanvas,
        thumbnail_url: render_url,
        updated_at: new Date().toISOString(),
      }).eq('id', post.template_id)

      fixed++
    } catch (err) {
      errors.push(`post ${post.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ fixed, total: posts.length, errors })
}
