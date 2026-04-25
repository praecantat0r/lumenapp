import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishToInstagram } from '@/lib/instagram'
import { indexPostAsExample } from '@/lib/context-builder'
import { decryptToken } from '@/lib/token-crypto'
import type { BrandBrain, Post } from '@/types'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (!post.render_url) return NextResponse.json({ error: 'Post has no render image' }, { status: 400 })

  const { data: igConn } = await supabase
    .from('instagram_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (!igConn) return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })

  try {
    const caption = [post.caption, post.hashtags].filter(Boolean).join('\n\n')
    const { instagram_post_id, permalink } = await publishToInstagram(
      igConn.instagram_user_id,
      decryptToken(igConn.access_token),
      post.render_url,
      caption
    )

    await supabase.from('posts').update({
      status: 'published',
      instagram_post_id,
      instagram_permalink: permalink,
      published_at: new Date().toISOString(),
    }).eq('id', id)

    // Index this post as a learned example for future generations (fire-and-forget)
    const { data: bb } = await supabase
      .from('brand_brains')
      .select('industry, tone_keywords')
      .eq('user_id', user.id)
      .single()
    if (bb) {
      indexPostAsExample(post as Post, bb as BrandBrain).catch(() => {/* non-critical */})
    }

    return NextResponse.json({ success: true, instagram_post_id, permalink })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Publish failed' }, { status: 500 })
  }
}
