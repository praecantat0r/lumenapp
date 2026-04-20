import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { renderPostServer } from '@/lib/renderer'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { template_id } = await req.json()
  if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

  const supabase = createServiceClient()

  try {
    const { render_url } = await renderPostServer({ template_id, canvas_overrides: {} })

    const { error } = await supabase
      .from('templates')
      .update({ thumbnail_url: render_url, updated_at: new Date().toISOString() })
      .eq('id', template_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ thumbnail_url: render_url })
  } catch (err: unknown) {
    console.error('[thumbnail] render failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
