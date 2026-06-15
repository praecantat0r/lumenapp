import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/server'
import { enhanceUserPrompt } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const description: string = body.description ?? ''
  if (!description.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  const { data: bb } = await supabase
    .from('brand_brains')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (!bb) return NextResponse.json({ error: 'Brand Brain not found' }, { status: 404 })

  try {
    const { variations } = await enhanceUserPrompt(description, bb)
    return NextResponse.json({ variations })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to enhance prompt: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 },
    )
  }
}
