import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { describeImageForCaption } from '@/lib/anthropic'
import { generateCaption } from '@/lib/openai'
import { buildBrandContext } from '@/lib/context-builder'
import type { BrandBrain } from '@/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageUrl } = await req.json().catch(() => ({}))
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

  const { data: bb } = await supabase.from('brand_brains').select('*').eq('user_id', user.id).single()
  if (!bb) return NextResponse.json({ error: 'Brand brain not found. Complete onboarding first.' }, { status: 404 })

  const [visualConcept, brandContext] = await Promise.all([
    describeImageForCaption(imageUrl),
    buildBrandContext(user.id, bb as BrandBrain),
  ])

  try {
    const { caption, hashtags } = await generateCaption(bb as BrandBrain, visualConcept, brandContext)
    return NextResponse.json({ caption, hashtags })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Caption generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
