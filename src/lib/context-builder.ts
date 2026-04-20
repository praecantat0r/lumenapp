import { createServiceClient } from '@/lib/supabase/service'
import type { BrandBrain, Post } from '@/types'

const EXAMPLE_FIELDS = 'id, image_prompt, visual_concept, caption, hashtags, performance_score, source'

export interface PromptExample {
  id: string
  image_prompt: string
  visual_concept: string
  caption: string
  hashtags: string
  performance_score: number
  source: string
}

export interface BrandContext {
  examples: PromptExample[]
}

// ── Seed retrieval with fallback chain ──────────────────────────────────────
// 1st: industry + tone overlap  2nd: industry only  (no cross-industry fallback)
async function fetchSeedExamples(
  service: ReturnType<typeof createServiceClient>,
  industry: string,
  toneKeywords: string[],
  limit: number,
  excludeIds: string[]
): Promise<PromptExample[]> {
  if (limit <= 0) return []

  const base = service
    .from('prompt_examples')
    .select(EXAMPLE_FIELDS)
    .eq('source', 'seed')
    .eq('approved', true)
    .order('performance_score', { ascending: false })
    .limit(limit)

  const exclude = (rows: PromptExample[]) =>
    rows.filter(r => !excludeIds.includes(r.id))

  // Attempt 1: industry + tone overlap
  if (toneKeywords.length > 0) {
    const { data } = await base
      .eq('industry', industry)
      .overlaps('tone_tags', toneKeywords)
    const filtered = exclude(data || [])
    if (filtered.length >= limit) return filtered.slice(0, limit)
    // partial match — continue and fill below
    if (filtered.length > 0) {
      const stillNeeded = limit - filtered.length
      const moreIds = [...excludeIds, ...filtered.map(r => r.id)]
      const extras = await fetchSeedExamples(service, industry, [], stillNeeded, moreIds)
      return [...filtered, ...extras]
    }
  }

  // Attempt 2: industry only
  const { data: byIndustry } = await base.eq('industry', industry)
  const filteredIndustry = exclude(byIndustry || [])
  // Return whatever industry-matched examples we found — never pad with
  // off-industry seed data, which causes cross-genre hallucinations.
  return filteredIndustry.slice(0, limit)
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function buildBrandContext(
  userId: string,
  brandBrain: BrandBrain
): Promise<BrandContext> {
  const service = createServiceClient()

  // 1. User's own published examples (best performing first)
  const { data: userExamples } = await service
    .from('prompt_examples')
    .select(EXAMPLE_FIELDS)
    .eq('user_id', userId)
    .eq('source', 'user_published')
    .eq('approved', true)
    .order('performance_score', { ascending: false })
    .limit(3)

  const userEx: PromptExample[] = userExamples || []
  const needed = 3 - userEx.length
  const excludeIds = userEx.map(e => e.id)

  // 2. Fill remaining slots with seed examples
  const seedEx = await fetchSeedExamples(
    service,
    brandBrain.industry,
    brandBrain.tone_keywords || [],
    needed,
    excludeIds
  )

  return { examples: [...userEx, ...seedEx] }
}

// ── Phase 3: index a published post as a learned example ────────────────────

export async function indexPostAsExample(
  post: Post,
  brandBrain: BrandBrain
): Promise<void> {
  // Require minimum fields
  if (!post.image_prompt || !post.caption) return

  const visualConcept =
    (post.generation_metadata as Record<string, string> | null)?.visual_concept || ''

  const service = createServiceClient()

  // Upsert by post id stored in generation_metadata — use delete+insert pattern
  // since we don't have a post_id column. Check for existing entry first.
  const { data: existing } = await service
    .from('prompt_examples')
    .select('id')
    .eq('user_id', post.user_id)
    .eq('source', 'user_published')
    // Match by first 120 chars of image_prompt as a proxy for the post
    .like('image_prompt', post.image_prompt.slice(0, 120) + '%')
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Already indexed — update score to published level
    await service
      .from('prompt_examples')
      .update({ source: 'user_published', performance_score: 0.5 })
      .eq('id', existing.id)
    return
  }

  await service.from('prompt_examples').insert({
    industry: brandBrain.industry,
    tone_tags: brandBrain.tone_keywords || [],
    source: 'user_published',
    user_id: post.user_id,
    image_prompt: post.image_prompt,
    visual_concept: visualConcept,
    caption: post.caption,
    hashtags: post.hashtags || '',
    template_layers: post.template_layers ?? null,
    performance_score: 0.5,   // base score for published; updated when analytics arrive
    approved: true,
  })
}
