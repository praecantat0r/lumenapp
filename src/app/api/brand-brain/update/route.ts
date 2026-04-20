import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import { z } from 'zod'

const schema = z.object({
  brand_name: z.string().nullish(),
  website_url: z.string().nullish(),
  industry: z.string().nullish(),
  location: z.string().nullish(),
  language: z.string().nullish(),
  brand_description: z.string().nullish(),
  products: z.string().nullish(),
  slogans: z.string().nullish(),
  tone_keywords: z.array(z.string()).nullish(),
  tone_description: z.string().nullish(),
  target_audience: z.string().nullish(),
  audience_problem: z.string().nullish(),
  post_topics: z.string().nullish(),
  post_avoid: z.string().nullish(),
  content_ratio: z.string().nullish(),
  special_offer: z.string().nullish(),
  discount: z.string().nullish(),
  include_people: z.boolean().nullish(),
  materials_link: z.string().nullish(),
  platforms: z.array(z.string()).nullish(),
  posting_frequency: z.string().nullish(),
  posting_time: z.string().nullish(),
  status: z.enum(['active', 'paused']).nullish(),
}).passthrough()

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Fetch current brand brain to merge with incoming changes for prompt building
  const { data: current } = await supabase
    .from('brand_brains')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const merged = { ...current, ...parsed.data }
  const ai_brand_profile = buildBrandSystemPrompt(merged as Parameters<typeof buildBrandSystemPrompt>[0])

  // Separate promo + optional fields — saved independently so a missing column doesn't break the whole save
  const { special_offer, discount, include_people, ...coreData } = parsed.data

  const { data, error } = await supabase
    .from('brand_brains')
    .update({ ...coreData, ai_brand_profile, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Save promo + optional fields separately
  if (special_offer !== undefined || discount !== undefined || include_people !== undefined) {
    const extraUpdate: Record<string, unknown> = {}
    if (special_offer !== undefined) extraUpdate.special_offer = special_offer
    if (discount !== undefined) extraUpdate.discount = discount
    if (include_people !== undefined) extraUpdate.include_people = include_people
    const { error: extraError } = await supabase
      .from('brand_brains')
      .update(extraUpdate)
      .eq('user_id', user.id)
    if (extraError) {
      // Columns likely don't exist yet — return warning so the client knows
      return NextResponse.json(
        { ...data, _warning: 'Some fields could not be saved. Run SQL migration: ALTER TABLE brand_brains ADD COLUMN special_offer text; ALTER TABLE brand_brains ADD COLUMN discount text; ALTER TABLE brand_brains ADD COLUMN include_people boolean DEFAULT true;' },
        { status: 200 }
      )
    }
  }

  return NextResponse.json(data)
}
