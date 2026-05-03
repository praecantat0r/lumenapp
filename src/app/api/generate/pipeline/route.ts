import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getLimits, monthStart } from '@/lib/plans'
import { VALIDATION_THRESHOLD, VALIDATION_THRESHOLD_ASSET, VALIDATION_HARD_FAIL } from '@/lib/constants'

export const maxDuration = 300
import { createServiceClient } from '@/lib/supabase/service'
import { generateCaption, generateOriginalImagePrompt, generateAssetImagePrompt, generateCompositeImagePrompt, validatePost, analyzeLocationPhoto, analyzeProductAsset, type AssetGuidance } from '@/lib/anthropic'
import { buildBrandContext } from '@/lib/context-builder'
import { generateImage } from '@/lib/nanobanana'
import { renderPostServer, seedUserDefaultTemplate, SEED_CANVAS_JSON } from '@/lib/renderer'
import type { BrandBrain } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`gen:${user.id}`, 10, 60_000)) return rateLimitResponse()

  // Parse request body early — assetMode is needed for the composite plan check below
  let assetMode: 'original' | 'specific' | 'auto' | 'composite' = 'original'
  let selectedAssetUrl: string | undefined
  let selectedAssetName: string | undefined
  let selectedAssetType: string | undefined
  let selectedAssetDescription: string | undefined
  let scenicAssetUrl: string | undefined
  let scenicAssetName: string | undefined
  let scenicAssetDescription: string | undefined
  let productAssetUrl: string | undefined
  let productAssetName: string | undefined
  let productAssetDescription: string | undefined
  try {
    const body = await req.json().catch(() => ({}))
    if (body.assetMode)             assetMode             = body.assetMode
    if (body.assetUrl)              selectedAssetUrl      = body.assetUrl
    if (body.assetName)             selectedAssetName     = body.assetName
    if (body.assetType)             selectedAssetType     = body.assetType
    if (body.assetDescription)      selectedAssetDescription = body.assetDescription
    if (body.scenicAssetUrl)        scenicAssetUrl        = body.scenicAssetUrl
    if (body.scenicAssetName)       scenicAssetName       = body.scenicAssetName
    if (body.scenicAssetDescription) scenicAssetDescription = body.scenicAssetDescription
    if (body.productAssetUrl)       productAssetUrl       = body.productAssetUrl
    if (body.productAssetName)      productAssetName      = body.productAssetName
    if (body.productAssetDescription) productAssetDescription = body.productAssetDescription
  } catch { /* no body */ }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const limits = getLimits(profile?.plan ?? 'free')

  if (assetMode === 'composite' && !limits.composite) {
    return NextResponse.json({ error: 'Composite mode requires the Growth plan or higher.' }, { status: 403 })
  }

  if (limits.postsPerMonth !== -1) {
    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('status', 'failed')
      .gte('created_at', monthStart())
    if ((count ?? 0) >= limits.postsPerMonth) {
      return NextResponse.json({
        error: `Monthly post limit reached (${limits.postsPerMonth} posts). Upgrade your plan or wait until next month.`,
      }, { status: 403 })
    }
  }

  const { data: bb } = await supabase
    .from('brand_brains')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (!bb) return NextResponse.json({ error: 'Brand Brain not found' }, { status: 404 })

  // Analyze scenic reference images with Claude Vision FIRST so the prompt can accurately
  // recreate the environment. Without this, Claude has no idea what's in the photo and
  // generates a random brand-topic scene instead of using the reference as the backdrop.
  // Applies to both place_photo (explicit location) and photo (general scene/environment).
  let locationDescription: string | undefined
  if (assetMode === 'specific' && selectedAssetUrl &&
      (selectedAssetType === 'place_photo' || selectedAssetType === 'photo')) {
    try {
      locationDescription = await analyzeLocationPhoto(selectedAssetUrl)
    } catch {
      // Non-fatal — prompt will fall back to brand context
    }
  }
  // For composite: analyze the scenic asset to get the environment description
  if (assetMode === 'composite' && scenicAssetUrl) {
    try {
      locationDescription = await analyzeLocationPhoto(scenicAssetUrl)
    } catch {
      // Non-fatal — composite prompt will use a generic environment fallback
    }
  }

  // Analyze product physical appearance with Claude Vision so Gemini gets a precise verbal
  // description of shape, color, materials, and finish — not just the reference image alone.
  // Without this, Gemini may change colors, simplify labels, or alter the product's form.
  let productPhysicalDescription: string | undefined
  let productPhysicalDescriptionComposite: string | undefined
  if (assetMode === 'specific' && selectedAssetUrl && selectedAssetType === 'product_photo') {
    try {
      productPhysicalDescription = await analyzeProductAsset(selectedAssetUrl)
    } catch {
      // Non-fatal — prompt will rely on reference image alone
    }
  }
  if (assetMode === 'composite' && productAssetUrl) {
    try {
      productPhysicalDescriptionComposite = await analyzeProductAsset(productAssetUrl)
    } catch {
      // Non-fatal — composite prompt will rely on reference image alone
    }
  }

  // Resolve reference image URLs for NanoBanana.
  // All asset types (including place_photo) are now passed — the image prompt for place_photo
  // explicitly tells Gemini to use the reference as the environment, not as a framed object.
  let assetUrls: string[] = []
  let autoAssetTypeSummary: string | undefined
  if (assetMode === 'specific' && selectedAssetUrl) {
    assetUrls = [selectedAssetUrl]
  } else if (assetMode === 'auto') {
    const { data: assets } = await supabase
      .from('brand_assets')
      .select('public_url, asset_type, name')
      .eq('user_id', user.id)
      .limit(5)
    assetUrls = (assets || []).map((a: { public_url: string }) => a.public_url)
    // Build a type summary so Claude knows what kind of assets it's working with
    if (assets?.length) {
      const counts: Record<string, number> = {}
      for (const a of assets) {
        const t = (a as { asset_type?: string }).asset_type || 'other'
        counts[t] = (counts[t] || 0) + 1
      }
      autoAssetTypeSummary = Object.entries(counts)
        .map(([t, n]) => `${n}× ${t.replace(/_/g, ' ')}`)
        .join(', ')
    }
  } else if (assetMode === 'composite' && scenicAssetUrl && productAssetUrl) {
    // Product FIRST — Gemini gives most weight to the first reference image,
    // so we want the product (the hero) to be image 1. The scene goes second
    // and is used as atmospheric background. The prompt labels them accordingly.
    assetUrls = [productAssetUrl, scenicAssetUrl]
  }

  // Build asset guidance for the Claude prompt
  const assetGuidance: AssetGuidance | undefined =
    assetMode === 'specific' && selectedAssetUrl
      ? { url: selectedAssetUrl, name: selectedAssetName, type: selectedAssetType || 'photo', mode: 'specific', locationDescription, description: selectedAssetDescription, productPhysicalDescription }
      : assetMode === 'auto' && assetUrls.length > 0
      ? { url: assetUrls[0], name: 'brand assets', type: 'photo', mode: 'auto', assetTypeSummary: autoAssetTypeSummary }
      : assetMode === 'composite' && scenicAssetUrl && productAssetUrl
      ? { url: scenicAssetUrl, name: scenicAssetName, type: 'place_photo', mode: 'composite', locationDescription, description: scenicAssetDescription, productUrl: productAssetUrl, productName: productAssetName, productDescription: productAssetDescription, productPhysicalDescriptionComposite }
      : undefined

  // Build asset note for the caption writer — concrete facts from user's AI insight fields
  const assetNote: string | undefined = (() => {
    if (assetMode === 'composite') {
      // Caption focuses on the product only — the scene is atmosphere/background, not a selling point.
      // scenicAssetDescription flows to the image prompt via assetGuidance.description instead.
      const parts: string[] = []
      if (productAssetName)        parts.push(`Product: ${productAssetName}`)
      if (productAssetDescription) parts.push(`About the product: ${productAssetDescription}`)
      return parts.length > 0 ? parts.join('\n') : undefined
    }
    if (assetMode === 'specific') {
      return selectedAssetDescription ? `About this asset: ${selectedAssetDescription}` : undefined
    }
    return undefined
  })()

  // Create the post record immediately so every step can update it
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({ user_id: user.id, status: 'generating' })
    .select()
    .single()
  if (postError) return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })

  const postId = post.id

  // Helper — saves partial data and optionally marks failure
  async function save(fields: Record<string, unknown>, failed = false) {
    await supabase
      .from('posts')
      .update(failed ? { ...fields, status: 'failed' } : fields)
      .eq('id', postId)
  }

  try {
    // ── User template selection (round-robin among use_for_generation=true) ──
    const serviceClient = createServiceClient()
    const { data: userTemplates } = await serviceClient
      .from('templates')
      .select('id, name, canvas_json, width, height')
      .eq('user_id', user.id)
      .eq('is_user_template', true)
      .eq('use_for_generation', true)
      .eq('is_active', true)

    // Seed a default library template if the user has none
    if (!userTemplates?.length) {
      await seedUserDefaultTemplate(user.id)
    }

    // Pick the least-recently-used template for round-robin variety
    let selectedPoolTemplate: any = null
    if (userTemplates?.length) {
      const { data: recentMeta } = await supabase
        .from('posts')
        .select('generation_metadata')
        .eq('user_id', user.id)
        .not('generation_metadata->pool_template_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(userTemplates.length)

      const recentlyUsedIds = new Set(
        (recentMeta || []).map((p: any) => p.generation_metadata?.pool_template_id).filter(Boolean)
      )

      selectedPoolTemplate =
        userTemplates.find((t: { id: string }) => !recentlyUsedIds.has(t.id)) ??
        userTemplates[0]
    }

    // Resolved base layout — user's selected template if available, SEED otherwise
    const baseLayout: typeof SEED_CANVAS_JSON = selectedPoolTemplate?.canvas_json ?? SEED_CANVAS_JSON

    // ── Brand context (few-shot examples) ───────────────────────────────────
    const brandContext = await buildBrandContext(user.id, bb as BrandBrain)

    // ── Post mode: topics vs services based on content_ratio ────────────────
    const topicsRatioMatch = (bb.content_ratio || '').match(/(\d+)%\s*topics/i)
    const topicsTargetRatio = topicsRatioMatch ? parseInt(topicsRatioMatch[1]) / 100 : 0.6

    const { data: recentModePosts } = await supabase
      .from('posts')
      .select('generation_metadata')
      .eq('user_id', user.id)
      .not('generation_metadata->post_mode', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)

    const recentModes = (recentModePosts || [])
      .map((p: any) => p.generation_metadata?.post_mode)
      .filter((m: unknown) => m === 'topics' || m === 'services') as ('topics' | 'services')[]

    const topicsCount = recentModes.filter(m => m === 'topics').length
    const currentTopicsRatio = recentModes.length > 0 ? topicsCount / recentModes.length : topicsTargetRatio
    const postMode: 'topics' | 'services' = currentTopicsRatio < topicsTargetRatio ? 'topics' : 'services'

    // ── Steps 1–2: Generate text content + validate (retry loop) ───────────
    // Fetch recent image prompts so the AI generates a fresh concept each time
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('image_prompt')
      .eq('user_id', user.id)
      .not('image_prompt', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)
    const recentImagePrompts = (recentPosts || [])
      .map((p: { image_prompt: string | null }) => p.image_prompt)
      .filter(Boolean) as string[]

    const { data: recentShotStylePosts } = await supabase
      .from('posts')
      .select('generation_metadata')
      .eq('user_id', user.id)
      .not('generation_metadata->shot_style', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3)
    const recentShotStyles = (recentShotStylePosts || [])
      .map((p: any) => p.generation_metadata?.shot_style)
      .filter(Boolean) as string[]

    const MAX_ATTEMPTS = 2
    let image_prompt!: string
    let template_layers: any
    let visual_concept!: string
    let caption!: string
    let hashtags!: string
    let validationFeedback: string | undefined
    let validationScore = 0
    let validationAttempts = 0
    let selectedShotStyle: string | undefined

    // Track the best attempt in case all fall short of the threshold
    let bestScore = -1
    let bestImagePrompt: string | undefined
    let bestTemplateLayers: any
    let bestVisualConcept: string | undefined
    let bestCaption: string | undefined
    let bestHashtags: string | undefined
    let bestValidationFeedback: string | undefined

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      validationAttempts = attempt

      try {
        if (assetMode === 'composite' && assetGuidance) {
          ;({ image_prompt, template_layers, visual_concept, selectedShotStyle } = await generateCompositeImagePrompt(bb as BrandBrain, assetGuidance, recentImagePrompts, brandContext, validationFeedback))
        } else if ((assetMode === 'specific' || assetMode === 'auto') && assetGuidance) {
          ;({ image_prompt, template_layers, visual_concept, selectedShotStyle } = await generateAssetImagePrompt(bb as BrandBrain, assetGuidance, recentImagePrompts, brandContext, validationFeedback, postMode, recentShotStyles))
        } else {
          ;({ image_prompt, template_layers, visual_concept, selectedShotStyle } = await generateOriginalImagePrompt(bb as BrandBrain, recentImagePrompts, brandContext, validationFeedback, postMode, recentShotStyles))
        }
      } catch (err) {
        await save({}, true)
        return NextResponse.json({ error: 'Image prompt generation failed: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
      }

      try {
        ;({ caption, hashtags } = await generateCaption(bb as BrandBrain, visual_concept, brandContext, validationFeedback, assetNote, assetMode))
      } catch (err) {
        await save({ image_prompt, template_layers }, true)
        return NextResponse.json({ error: 'Caption generation failed: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
      }

      // Original posts: full 5-criterion validation.
      // Asset posts: lightweight validation — skip brand specificity and depth (can't fairly
      // evaluate those without knowing the asset), but enforce language and rules.
      const validation = assetMode === 'original'
        ? await validatePost(bb as BrandBrain, { caption, hashtags, visual_concept, image_prompt }, assetNote)
        : await validatePost(bb as BrandBrain, { caption, hashtags, visual_concept, image_prompt }, assetNote, ['specificity', 'depth'])

      validationScore = validation.score

      // Keep track of the best attempt so far
      if (validationScore > bestScore) {
        bestScore = validationScore
        bestImagePrompt = image_prompt
        bestTemplateLayers = template_layers
        bestVisualConcept = visual_concept
        bestCaption = caption
        bestHashtags = hashtags
        bestValidationFeedback = validation.feedback
      }

      const passThreshold = assetMode === 'original' ? VALIDATION_THRESHOLD : VALIDATION_THRESHOLD_ASSET
      if (validationScore >= passThreshold) break

      validationFeedback = validation.feedback
    }

    // Use the best attempt regardless of score — validation improves quality via retries
    // but should never block generation entirely. Hard-fail only if something is truly broken.
    if (bestScore < VALIDATION_HARD_FAIL) {
      await save({ image_prompt, template_layers, caption, hashtags, generation_metadata: {
        validation_failed: true,
        validation_attempts: validationAttempts,
        validation_score: bestScore,
        validation_feedback: validationFeedback,
      }}, true)
      return NextResponse.json({
        error: 'Post failed brand validation.',
        validation_score: bestScore,
        validation_attempts: validationAttempts,
        validation_feedback: validationFeedback,
      }, { status: 422 })
    }

    // Restore best attempt content if we didn't exit the loop on a passing score
    if (validationScore < VALIDATION_THRESHOLD) {
      image_prompt = bestImagePrompt!
      template_layers = bestTemplateLayers
      visual_concept = bestVisualConcept!
      caption = bestCaption!
      hashtags = bestHashtags!
      validationScore = bestScore
    }

    await save({ image_prompt, template_layers, caption, hashtags })

    // ── Step 3: AI image ────────────────────────────────────────────────────
    // Append hard negative constraints to the prompt before sending to Gemini.
    // These override anything Claude may have written and ensure Gemini always
    // receives explicit prohibitions regardless of the image_prompt content.
    const isAssetMode = assetMode === 'specific' || assetMode === 'composite'
    const negativeConstraints: string[] = [
      'no underglow',
      'no neon ground lighting',
      'no light strips or light pools beneath objects',
      ...(isAssetMode
        ? [
            'no additional objects or props of any kind',
            'no bottles, jars, or extra containers',
            'no candles, no food items, no decorations',
            'only the reference product is present in the scene',
          ]
        : [
            'no unrelated props',
            'no bottles, jars, or containers unless they are the explicit subject of this post',
          ]
      ),
    ]
    if (bb.include_people === false) {
      negativeConstraints.push(
        'no people',
        'no humans',
        'no persons',
        'no figures',
        'no hands',
        'no body parts',
        'no silhouettes',
      )
    }
    const constrainedPrompt = `${image_prompt} ${negativeConstraints.join(', ')}.`

    let image_url: string
    try {
      image_url = await generateImage(constrainedPrompt, assetUrls)
    } catch (err) {
      await save({ caption, hashtags, image_prompt, template_layers }, true)
      return NextResponse.json({ error: 'Image generation failed: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
    }
    await save({ image_url })

    // ── Step 4: Render ──────────────────────────────────────────────────────
    let render_url: string
    let template_id: string
    try {
      const baseTemplateId = selectedPoolTemplate?.id ?? await seedUserDefaultTemplate(user.id)

      // Build the merged canvas first — apply content-specific overrides onto the base layout.
      // angle is reset to 0 for all objects to avoid stale rotations from previous edits.
      const canvas_overrides: Record<string, Record<string, unknown>> = {}
      for (const obj of baseLayout.objects) {
        if (!obj.lumenId) continue
        canvas_overrides[obj.lumenId] = { ...(obj as Record<string, unknown>), angle: 0 }
      }
      canvas_overrides['background-image'] = { ...canvas_overrides['background-image'], src: image_url }
      canvas_overrides['title']            = { ...canvas_overrides['title'],      text: (template_layers as any).title    || '' }
      canvas_overrides['subtitle']         = { ...canvas_overrides['subtitle'],   text: (template_layers as any).subtitle || '' }
      canvas_overrides['cta']              = { ...canvas_overrides['cta'],        text: (template_layers as any).cta      || '' }
      canvas_overrides['brand-name']       = { ...canvas_overrides['brand-name'], text: (template_layers as any).brand_name || bb.brand_name }

      const mergedObjects = baseLayout.objects
        .filter((obj: any) => {
          // Always keep non-text objects
          if (obj.type !== 'textbox') return true
          // Always keep objects with a lumenId (they get real content injected above)
          if (obj.lumenId) return true
          // Drop unlabelled text objects whose text is still a canvas-editor placeholder
          const t = (typeof obj.text === 'string' ? obj.text : '').trim()
          return t !== 'Text' && t !== 'text' && t !== ''
        })
        .map((obj: any) =>
          obj.lumenId && canvas_overrides[obj.lumenId as string]
            ? { ...obj, ...canvas_overrides[obj.lumenId as string] }
            : obj
        )
      const mergedCanvas = { ...baseLayout, objects: mergedObjects }

      // Create the post-specific template FIRST so the render uses the exact same
      // canvas_json the editor will later load — eliminating any pool-template drift.
      const postTitle = ((template_layers as any).title as string) || caption.slice(0, 48) || 'Generated Post'
      const { data: postTemplate } = await serviceClient
        .from('templates')
        .insert({
          user_id: user.id,
          name: postTitle,
          description: `${bb.brand_name} · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          canvas_json: mergedCanvas,
          width: baseLayout.width,
          height: baseLayout.height,
          category: 'instagram',
          is_active: true,
          is_user_template: false,
          use_for_generation: false,
        })
        .select('id')
        .single()

      template_id = postTemplate?.id ?? baseTemplateId

      // Render from the post-specific template with no extra overrides — the canvas_json
      // already has everything baked in, so render and editor always use identical data.
      ;({ render_url } = await renderPostServer({ template_id, canvas_overrides: {} }))

      // Back-fill thumbnail_url on the template now that we have the render
      if (postTemplate?.id) {
        await serviceClient.from('templates').update({ thumbnail_url: render_url }).eq('id', postTemplate.id)
      }

      await save({
        template_id,
        canvas_overrides,
        render_url,
        templated_render_id: null,
        status: 'pending_review',
        generation_metadata: {
          bb_snapshot: { id: bb.id, brand_name: bb.brand_name },
          pool_template_id: selectedPoolTemplate?.id ?? null,
          pool_template_name: selectedPoolTemplate?.name ?? null,
          asset_mode: assetMode,
          asset_url: selectedAssetUrl ?? scenicAssetUrl ?? null,
          asset_urls: assetMode === 'composite' ? [scenicAssetUrl, productAssetUrl].filter(Boolean) : null,
          asset_name: selectedAssetName ?? scenicAssetName ?? null,
          visual_concept,
          post_mode: postMode,
          shot_style: selectedShotStyle ?? null,
          validation_score: validationScore,
          validation_attempts: validationAttempts,
          validation_feedback: bestValidationFeedback ?? null,
        },
      })
    } catch (err) {
      await save({ caption, hashtags, image_prompt, template_layers, image_url }, true)
      return NextResponse.json({ error: 'Render failed: ' + (err instanceof Error ? err.message : String(err)) }, { status: 500 })
    }

    return NextResponse.json({
      post_id: postId,
      render_url,
      caption,
      hashtags,
      post_mode: postMode,
      asset_mode: assetMode,
      validation_score: validationScore,
      validation_attempts: validationAttempts,
      validation_feedback: bestValidationFeedback ?? null,
      visual_concept,
      image_prompt,
    })

  } catch (err: unknown) {
    // Outer safety net — shouldn't normally be reached
    await supabase.from('posts').update({ status: 'failed' }).eq('id', postId)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Pipeline failed' }, { status: 500 })
  }
}
