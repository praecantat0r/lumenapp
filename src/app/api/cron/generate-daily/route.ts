import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCaption } from '@/lib/openai'
import { generateOriginalImagePrompt, validatePost } from '@/lib/anthropic'
import { buildBrandContext } from '@/lib/context-builder'
import { generateImage } from '@/lib/nanobanana'
import { renderPostServer, getOrSeedTemplateId } from '@/lib/renderer'
import { rateLimit } from '@/lib/rate-limit'
import type { BrandBrain } from '@/types'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!rateLimit('cron:generate-daily', 5, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = await createClient()

  const { data: brandBrains } = await supabase
    .from('brand_brains')
    .select('*, profiles(id, plan)')
    .eq('onboarding_complete', true)
    .eq('status', 'active')

  if (!brandBrains) return NextResponse.json({ processed: 0 })

  let processed = 0

  for (const bb of brandBrains) {
    try {
      // Skip non-premium accounts
      const plan = (bb as any).profiles?.plan
      if (!plan || plan === 'free') continue

      // Check if we need to generate today based on frequency
      const freq = bb.posting_frequency || '3x/week'
      const daysMap: Record<string, number> = {
        'Daily': 1, '5x/week': 1.4, '3x/week': 2.3, '2x/week': 3.5, '1x/week': 7
      }
      const daysBetween = daysMap[freq] || 2.3

      const { data: lastPost } = await supabase
        .from('posts')
        .select('created_at')
        .eq('user_id', bb.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastPost) {
        const hoursSince = (Date.now() - new Date(lastPost.created_at).getTime()) / (1000 * 60 * 60)
        if (hoursSince < daysBetween * 24 * 0.9) continue
      }

      // Check Instagram connected
      const { data: igConn } = await supabase
        .from('instagram_connections')
        .select('id')
        .eq('user_id', bb.user_id)
        .single()
      if (!igConn) continue

      // Create post and run pipeline
      const { data: post } = await supabase
        .from('posts')
        .insert({ user_id: bb.user_id, status: 'generating' })
        .select()
        .single()
      if (!post) continue

      const { data: recentPostsData } = await supabase
        .from('posts')
        .select('image_prompt')
        .eq('user_id', bb.user_id)
        .not('image_prompt', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)
      const recentImagePrompts = (recentPostsData || [])
        .map((p: { image_prompt: string | null }) => p.image_prompt)
        .filter(Boolean) as string[]

      const brandContext = await buildBrandContext(bb.user_id, bb as BrandBrain)

      // ── Post mode: topics vs products based on content_ratio ─────────────
      const topicsRatioMatch = (bb.content_ratio || '').match(/(\d+)%\s*topics/i)
      const topicsTargetRatio = topicsRatioMatch ? parseInt(topicsRatioMatch[1]) / 100 : 0.6

      const { data: recentModePosts } = await supabase
        .from('posts')
        .select('generation_metadata')
        .eq('user_id', bb.user_id)
        .not('generation_metadata->post_mode', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)

      const recentModes = (recentModePosts || [])
        .map((p: any) => p.generation_metadata?.post_mode)
        .filter((m: unknown) => m === 'topics' || m === 'services') as ('topics' | 'services')[]

      const topicsCount = recentModes.filter(m => m === 'topics').length
      const currentTopicsRatio = recentModes.length > 0 ? topicsCount / recentModes.length : topicsTargetRatio
      const postMode: 'topics' | 'services' = currentTopicsRatio < topicsTargetRatio ? 'topics' : 'services'

      // ── Generate text + validate (retry loop) ────────────────────────────
      const MAX_ATTEMPTS = 3
      let image_prompt!: string
      let template_layers: any
      let visual_concept!: string
      let caption!: string
      let hashtags!: string
      let validationFeedback: string | undefined
      let validationScore = 0
      let validationAttempts = 0

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        validationAttempts = attempt
        ;({ image_prompt, template_layers, visual_concept } = await generateOriginalImagePrompt(bb as BrandBrain, recentImagePrompts, brandContext, validationFeedback, postMode))
        ;({ caption, hashtags } = await generateCaption(bb as BrandBrain, visual_concept, brandContext, validationFeedback))

        let validation: { score: number; feedback: string }
        try {
          validation = await validatePost(bb as BrandBrain, { caption, hashtags, visual_concept, image_prompt })
        } catch {
          validation = { score: 1, feedback: '' }
        }

        validationScore = validation.score
        if (validationScore >= 0.7) break
        validationFeedback = validation.feedback
      }

      if (validationScore < 0.7) {
        await supabase.from('posts').update({
          image_prompt, template_layers, caption, hashtags,
          status: 'failed',
          generation_metadata: { source: 'cron', bb_id: bb.id, validation_failed: true, validation_score: validationScore, validation_attempts: validationAttempts, validation_feedback: validationFeedback },
        }).eq('id', post.id)
        console.error(`Cron: post for user ${bb.user_id} failed brand validation after ${validationAttempts} attempts. Score: ${validationScore}. Feedback: ${validationFeedback}`)
        continue
      }

      await supabase.from('posts').update({ image_prompt, template_layers, caption, hashtags }).eq('id', post.id)

      const image_url = await generateImage(image_prompt, [])
      await supabase.from('posts').update({ image_url }).eq('id', post.id)

      const template_id = await getOrSeedTemplateId()
      const canvas_overrides = {
        'background-image': { src: image_url },
        'title':            { text: (template_layers as any).title || '' },
        'subtitle':         { text: (template_layers as any).subtitle || '' },
        'cta':              { text: (template_layers as any).cta || '' },
        'brand-name':       { text: (template_layers as any).brand_name || bb.brand_name },
      }
      const { render_url } = await renderPostServer({ template_id, canvas_overrides })

      await supabase.from('posts').update({
        template_id, canvas_overrides, render_url,
        status: 'pending_review',
        generation_metadata: { source: 'cron', bb_id: bb.id, visual_concept, post_mode: postMode, validation_score: validationScore, validation_attempts: validationAttempts },
      }).eq('id', post.id)

      processed++
    } catch (err) {
      console.error(`Cron generation failed for user ${bb.user_id}:`, err)
    }
  }

  return NextResponse.json({ processed })
}
