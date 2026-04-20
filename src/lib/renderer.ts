import { createServiceClient } from '@/lib/supabase/service'

export const SEED_CANVAS_JSON = {
  version: '5.3.0',
  background: '#111009',
  width: 1080,
  height: 1350,
  objects: [
    { type: 'rect', lumenId: 'background-image', left: 0, top: 0, width: 1080, height: 1350, fill: '#221F15', selectable: true },
    { type: 'rect', lumenId: 'overlay', left: 0, top: 0, width: 1080, height: 1350, fill: 'rgba(0,0,0,0.35)', selectable: true },
    { type: 'textbox', lumenId: 'brand-name', text: 'BRAND NAME', left: 60, top: 60, width: 400, fontSize: 28, fontFamily: 'IBM Plex Sans', fill: 'rgba(246,242,234,0.6)', fontWeight: '300', charSpacing: 8, selectable: true },
    { type: 'textbox', lumenId: 'title', text: 'Your Headline Here', left: 60, top: 900, width: 900, fontSize: 96, fontFamily: 'Syne', fontWeight: '700', fill: '#F6F2EA', lineHeight: 1.1, selectable: true },
    { type: 'textbox', lumenId: 'subtitle', text: 'Supporting line of text', left: 60, top: 1080, width: 900, fontSize: 44, fontFamily: 'IBM Plex Sans', fontWeight: '300', fill: 'rgba(246,242,234,0.75)', selectable: true },
    { type: 'textbox', lumenId: 'cta', text: 'Shop Now →', left: 60, top: 1200, width: 400, fontSize: 36, fontFamily: 'Syne', fontWeight: '600', fill: '#D4A84B', selectable: true },
  ],
}

export interface RenderInput {
  template_id: string
  canvas_overrides: Record<string, Record<string, unknown>>
}

export interface RenderResult {
  render_url: string
  file_name: string
}

// Server-side: calls /api/render using absolute URL
export async function renderPostServer(input: RenderInput): Promise<RenderResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RENDER_SECRET}`,
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Render failed: ${(err as { error?: string }).error || res.status}`)
  }

  return res.json()
}

// Ensure a user has at least one library template; seeds a default if not. Returns the template ID.
export async function seedUserDefaultTemplate(userId: string): Promise<string> {
  const supabase = createServiceClient()
  const { data: existing } = await supabase
    .from('templates')
    .select('id')
    .eq('user_id', userId)
    .eq('is_user_template', true)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (existing?.id) return existing.id

  const { data, error } = await supabase
    .from('templates')
    .insert({
      name: 'Default Template',
      description: 'Your base layout for generated posts. Edit anytime.',
      canvas_json: SEED_CANVAS_JSON,
      width: 1080,
      height: 1350,
      category: 'instagram',
      is_active: true,
      user_id: userId,
      is_user_template: true,
      use_for_generation: true,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error('Could not seed default template: ' + (error?.message ?? 'unknown'))
  return data.id
}

// Legacy fallback — kept for any external callers not yet migrated
export async function getOrSeedTemplateId(userId?: string): Promise<string> {
  if (userId) return seedUserDefaultTemplate(userId)
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('templates')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  if (data?.id) return data.id
  throw new Error('No templates exist and no userId provided to seed one.')
}
