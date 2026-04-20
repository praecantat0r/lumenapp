import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 24)

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('posts')
    .select('caption, hashtags, render_url, created_at')
    .eq('status', 'published')
    .not('render_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  return NextResponse.json({ posts: data ?? [] })
}
