import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const TemplateCreateSchema = z.object({
  name:              z.string().min(1).max(200),
  canvas_json:       z.record(z.string(), z.unknown()),
  width:             z.number().int().min(100).max(5000).optional(),
  height:            z.number().int().min(100).max(5000).optional(),
  thumbnail_url:     z.string().url().optional(),
  description:       z.string().max(1000).optional(),
  category:          z.string().max(100).optional(),
  use_for_generation: z.boolean().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('templates')
    .select('id, name, description, thumbnail_url, category, width, height, is_active, is_user_template, use_for_generation')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = TemplateCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('templates')
    .insert({ ...parsed.data, user_id: user.id, is_user_template: true, is_active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
