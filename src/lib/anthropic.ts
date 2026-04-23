import Anthropic from '@anthropic-ai/sdk'
import type { BrandBrain, SceneSettings } from '@/types'
import type { BrandContext } from '@/lib/context-builder'

export function buildBrandSystemPrompt(bb: BrandBrain): string {
  return `BRAND: ${bb.brand_name}
Industry: ${bb.industry}
Language: ${bb.language}
Description: ${bb.brand_description}
Products/Services: ${bb.products}
Tone: ${bb.tone_keywords?.join(', ')} — ${bb.tone_description}
Target Audience: ${bb.target_audience}
Audience Problem: ${bb.audience_problem}
Post Topics: ${bb.post_topics}
NEVER mention or imply: ${bb.post_avoid}
${bb.slogans ? `Slogans: ${bb.slogans}\n` : ''}${bb.content_ratio ? `Content mix: ${bb.content_ratio}\n` : ''}${bb.special_offer ? `ACTIVE SPECIAL OFFER: ${bb.special_offer}\n` : ''}${bb.discount ? `ACTIVE DISCOUNT: ${bb.discount}\n` : ''}${!bb.special_offer && !bb.discount ? `NO ACTIVE PROMOTIONS: Do NOT invent or imply any discounts, percentages, limited-time offers, or promotional language. Never write "X% off", "special price", "limited offer", or similar.\n` : ''}${bb.scraped_taglines?.length ? `Taglines from website: ${bb.scraped_taglines.join(' · ')}\n` : ''}${bb.scraped_about ? `About (from website): ${bb.scraped_about}` : ''}`.trim()
}

function getBrandProfile(bb: BrandBrain): string {
  return bb.ai_brand_profile || buildBrandSystemPrompt(bb)
}

export interface ValidationResult {
  score: number
  feedback: string
}

export async function validatePost(
  brandBrain: BrandBrain,
  post: { caption: string; hashtags: string; visual_concept: string; image_prompt: string },
  assetContext?: string
): Promise<ValidationResult> {
  const system = `You are a senior Instagram content strategist reviewing a post for the brand below. Your job is to catch posts that are technically on-topic but still weak — generic, predictable, or forgettable. Be genuinely critical.

${getBrandProfile(brandBrain)}
Score each criterion with exactly 0 or 1. No partial scores.

1. BRAND SPECIFICITY (weight 0.30)
   Could this caption be copy-pasted onto a competitor's post with almost no changes?
   1 = no — it contains something distinctly tied to THIS brand (specific service name, unique angle, brand voice detail, or product-specific quality)
   0 = yes — it's so generic that any similar business could post it unchanged

2. CONTENT DEPTH (weight 0.25)
   Does the caption give the reader a concrete reason to care — a specific fact, benefit, emotion, or story?
   1 = yes — tells the reader something real and specific
   0 = no — it's descriptive padding ("experience the difference", "your journey starts here", "we're here for you")

3. VISUAL MATCH (weight 0.20)
   Does the caption actually describe or connect to what's in the visual concept?
   1 = yes — the caption is clearly written for THIS specific image
   0 = no — the caption would work equally well on a completely different image

4. LANGUAGE (weight 0.15)
   Is it written entirely in ${brandBrain.language}?
   1 = yes
   0 = no — wrong language or mixed

5. RULES (weight 0.10)
   Does it avoid everything under NEVER mention?
${assetContext ? `   EXCEPTION: An asset was provided for this post (see ASSET CONTEXT in the user message). Content that directly describes or promotes the provided asset is ALWAYS allowed, even if the asset's category appears under "NEVER mention". Only score 0 if the caption invents or implies things NOT derived from the provided asset.` : ``}   1 = clean
   0 = violates a rule

Be strict on criteria 1 and 2 — these are where weak posts hide. A post that just names the brand and says something nice scores 0 on both.

Respond ONLY with valid JSON, no text outside it.`

  const userPrompt = `Review this post:
${assetContext ? `\nASSET CONTEXT: ${assetContext}\n` : ''}
VISUAL CONCEPT: ${post.visual_concept}
CAPTION: ${post.caption}

Respond with this exact JSON (replace the placeholder values):
{
  "reasoning": "one sentence per criterion explaining your score",
  "specificity": 0,
  "depth": 0,
  "visual_match": 0,
  "language": 0,
  "rules": 0,
  "feedback": "what specifically is weak or missing, or 'Passes all criteria' if genuinely strong"
}`

  const anthropic = getClient()
  let raw = '{}'
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    })
    raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  } catch (err) {
    console.error('Validator API call failed:', err)
    return { score: 0.5, feedback: 'Validator unavailable — treated as uncertain.' }
  }

  const jsonStr = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
  try {
    const p = JSON.parse(jsonStr)
    const toBin = (v: unknown) => (v === 1 || v === true ? 1 : 0)
    const score =
      toBin(p.specificity)  * 0.30 +
      toBin(p.depth)        * 0.25 +
      toBin(p.visual_match) * 0.20 +
      toBin(p.language)     * 0.15 +
      toBin(p.rules)        * 0.10
    return {
      score: Math.round(score * 100) / 100,
      feedback: p.feedback || 'No feedback provided.',
    }
  } catch {
    return { score: 0, feedback: 'Validator returned unparseable response.' }
  }
}

export async function generateCaption(
  brandBrain: BrandBrain,
  visualConcept: string,
  brandContext?: BrandContext,
  feedback?: string,
  assetNote?: string,
  assetMode?: 'original' | 'specific' | 'auto' | 'composite'
): Promise<{ caption: string; hashtags: string }> {
  const hasUserAsset = assetMode === 'specific' || assetMode === 'auto' || assetMode === 'composite'

  const system = `You are a professional social media copywriter for the brand "${brandBrain.brand_name}".

BRAND PROFILE:
- Industry: ${brandBrain.industry}
- Description: ${brandBrain.brand_description}
- Products/Services: ${brandBrain.products}
- Target Audience: ${brandBrain.target_audience}
- Audience Problem: ${brandBrain.audience_problem}
- Brand Tone: ${brandBrain.tone_keywords?.join(', ')} — ${brandBrain.tone_description}
- Topics to cover: ${brandBrain.post_topics}
- ${hasUserAsset ? `Do NOT add products, services, or claims beyond what is shown in the user-provided asset and scene description. The user's asset is the subject — describe it freely.` : `Never mention: ${brandBrain.post_avoid}`}
- Slogans: ${brandBrain.slogans || 'None'}
- Language: ${brandBrain.language}
${brandBrain.content_ratio ? `- Content mix strategy: ${brandBrain.content_ratio}\n` : ''}${brandBrain.scraped_taglines?.length ? `- Additional taglines from brand website: ${brandBrain.scraped_taglines.join(' · ')}\n` : ''}${brandBrain.scraped_about ? `- About the brand (from their website): ${brandBrain.scraped_about}\n` : ''}
CRITICAL RULES — you MUST follow these without exception:
1. LANGUAGE — this is the single most important rule. Write EVERY word in ${brandBrain.language} only. Zero exceptions.
   - Do NOT mix in words or phrases from any other language, including closely related ones (e.g. if the language is Slovak, do not use Czech, Russian, Serbian, or Ukrainian words; if the language is Russian, do not use Ukrainian, Bulgarian, or English words; etc.).
   - Use only the script that is native to ${brandBrain.language} — do not switch scripts mid-caption.
   - If you are unsure how to express something in ${brandBrain.language}, use a simpler word you are certain about. Never borrow from a similar language as a shortcut.
   - Re-read every word before outputting — if any word feels like it belongs to a different language, replace it.
2. ${hasUserAsset
  ? `The user is featuring their own product or content. Write about what the scene description mentions — the product, object, or setting described. You are not limited to the Products/Services list above; the described content is the user's real product, so promote it directly.
OVERRIDE: The "Never mention" line above does NOT apply when the user has provided their own asset. You MUST describe and promote the provided asset freely. Do NOT refuse or hedge. Only avoid inventing things not shown in the scene or asset description.`
  : `Write ONLY about what the brand actually offers as listed in Products/Services above. NEVER invent, mention, or imply products, merchandise, accessories, or services that are not listed there.`}
3. The caption MUST be grounded in the scene description you are given below. If the scene describes a gym space, write about the gym experience. If it describes a person training, write about training. Never write about something not mentioned in the scene.
4. The example captions below are for TONE and VOICE calibration only — their subject matter is irrelevant. Do NOT apply their product framing if it does not match what this brand actually sells.
5. Do NOT invent any discounts, promotions, or percentages — only use what is explicitly provided in the user prompt.

Write Instagram posts that match this brand voice precisely. Language: ${brandBrain.language} — every single word.
${brandContext?.examples.length ? `
CAPTION EXAMPLES — calibrate VOICE and TONE only. Do NOT copy. Do NOT reference these products or visuals.
${brandContext.examples.map((ex, i) => `
[Example ${i + 1}]
${ex.caption}`).join('\n---')}
` : ''}`

  const promoRequirement = (brandBrain.special_offer || brandBrain.discount)
    ? `\nPROMOTION TO INCLUDE IN THIS CAPTION — mandatory:${brandBrain.special_offer ? `\n- Seasonal/holiday context: "${brandBrain.special_offer}" — naturally weave this into the caption (greeting, occasion, seasonal reference). Do NOT mention any price, percentage, or discount amount here unless it is written explicitly in this text.` : ''}${brandBrain.discount ? `\n- Discount offer: "${brandBrain.discount}" — copy this EXACTLY into the caption. CRITICAL: apply it only to what is explicitly named in the offer text itself. Do NOT connect it to any service not mentioned in the offer text.` : ''}\nSTRICTLY FORBIDDEN: Do not invent or imply any percentage, price, discount amount, or promotional offer that is not word-for-word provided above.\n`
    : `\nNo active promotions. Do NOT mention any discounts, percentages, prices, or special offers — not even vaguely.\n`

  const userPrompt = `Write an Instagram caption for ${brandBrain.brand_name}.

POST SCENE DESCRIPTION: ${visualConcept}
The caption MUST be directly inspired by and relevant to this scene. Do not write about something unrelated to it.
${assetNote ? `\nPRODUCT/ASSET DETAILS — MANDATORY: The following specific qualities MUST appear explicitly in the caption. Name them directly — do not paraphrase vaguely or bury them in generic language. The reader must clearly understand these exact characteristics:\n${assetNote}\n` : ''}${promoRequirement}
Requirements:
- Engaging, authentic, on-brand
- 2-4 short paragraphs
- Directly connected to the described scene
- End with a subtle call-to-action
- Language: ${brandBrain.language}
- Tone: ${brandBrain.tone_keywords?.join(', ')}

Then on a new line write: HASHTAGS: followed by 20-25 relevant hashtags.

Format your response as:
CAPTION:
[caption text here]

HASHTAGS:
#hashtag1 #hashtag2 ...${feedback ? `\n\nPREVIOUS ATTEMPT REJECTED — validator feedback: ${feedback}\nCorrect these issues in your new version.` : ''}`

  const anthropic = getClient()
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const captionMatch = text.match(/CAPTION:\s*([\s\S]*?)(?=HASHTAGS:|$)/)
  const hashtagsMatch = text.match(/HASHTAGS:\s*([\s\S]*)$/)

  return {
    caption: captionMatch?.[1]?.trim() || text,
    hashtags: hashtagsMatch?.[1]?.trim() || '',
  }
}

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

interface TemplateLayers {
  title: string
  subtitle: string
  cta: string
  brand_name: string
}

export interface AgentOutput {
  image_prompt: string
  template_layers: TemplateLayers
  visual_concept: string
}

export interface AssetGuidance {
  url: string
  name?: string
  description?: string              // user's AI insight note
  productPhysicalDescription?: string // Claude vision analysis of the product's physical form
  type: string
  mode: 'specific' | 'auto' | 'composite'
  locationDescription?: string      // pre-analyzed for place_photo / composite scenic
  // composite-only:
  productUrl?: string
  productName?: string
  productDescription?: string
  productPhysicalDescriptionComposite?: string
}

export async function analyzeLocationPhoto(imageUrl: string): Promise<string> {
  const client = new Anthropic()
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 350,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        {
          type: 'text',
          text: `Describe this location photo in precise visual detail for use as an image generation environment brief. Cover:
- The type of space and its overall character
- Dominant colors (name them specifically: e.g. "matte black walls", "brushed steel", "warm amber pendant lights")
- Surface materials: floors, walls, ceilings
- Lighting: direction, quality (hard/soft), color temperature
- Key architectural features or design elements
- Atmosphere and mood in 1–2 words

IMPORTANT: Do NOT mention any TV screens, monitors, digital displays, picture frames, signage text, or logos in your description — describe only the physical environment, materials, and lighting. Write 3–5 dense sentences. Be extremely specific about colors, materials, and lighting.`,
        },
      ],
    }],
  })
  return (msg.content[0] as { type: string; text: string }).text.trim()
}

export async function analyzeProductAsset(imageUrl: string): Promise<string> {
  const client = new Anthropic()
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 350,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        {
          type: 'text',
          text: `Describe this product's physical appearance in precise detail for use in an image generation prompt. Cover ONLY the physical container and its visual properties — not what it contains:
- Container type and shape (e.g. "stand-up flexible pouch", "glass bottle", "cylindrical metal canister", "cardboard box")
- Exact dimensions/proportions (tall and narrow, squat and wide, etc.)
- Material and surface finish (matte plastic, glossy glass, kraft paper, metallic foil, etc.)
- Primary colors of the packaging itself (ignore label text content)
- Notable structural features (zip seal, pour spout, metal cap, handles, etc.)
- General label placement (label on front panel, wraparound label, top lid label, etc.)

IMPORTANT: Do NOT describe any brand names, product names, or readable text. Do NOT describe what the product IS or does. Describe ONLY the physical container as if describing an object. Write 2–3 dense, specific sentences.`,
        },
      ],
    }],
  })
  return (msg.content[0] as { type: string; text: string }).text.trim()
}

export async function describeImageForCaption(imageUrl: string): Promise<string> {
  const client = new Anthropic()
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        {
          type: 'text',
          text: `Describe what this image shows in 2–3 sentences. Focus on: the main subject, the setting or environment, the mood, and any notable visual details. Write as if briefing a copywriter who needs to write a social media caption — be specific and concrete about what is actually visible.`,
        },
      ],
    }],
  })
  return (msg.content[0] as { type: string; text: string }).text.trim()
}

// ─── Shared helpers ────────────────────────────────────────────────────────

const SHOT_STYLES = [
  {
    label: 'clean commercial',
    angle: 'straight-on eye level',
    lens: '85mm portrait lens, aperture f/2.8',
    lighting: 'soft diffused studio light from slightly above-left, gentle fill from right',
    composition: 'centered, product occupies 55% of frame height, clean negative space',
  },
  {
    label: 'cinematic low angle',
    angle: 'low angle — camera positioned below product, shooting upward',
    lens: '35mm wide-angle lens, aperture f/4',
    lighting: 'dramatic hard directional key light from above casting strong defined shadows',
    composition: 'dynamic, product slightly off-center, strong converging perspective lines',
  },
  {
    label: 'flat lay overhead',
    angle: 'overhead flat lay — camera directly above, shooting straight down (90°)',
    lens: '50mm standard lens, aperture f/5.6',
    lighting: 'soft even natural window light, no harsh shadows, clean and airy',
    composition: 'centered flat lay, supporting props arranged symmetrically or organically around the product',
  },
  {
    label: 'macro detail close-up',
    angle: 'extreme close-up — tight crop showing surface detail and texture',
    lens: '100mm macro lens, aperture f/2.8',
    lighting: 'single-source side lighting raking across the surface to reveal texture and micro-detail',
    composition: 'product fills entire frame, partial view — abstract crop of the most visually interesting area',
  },
  {
    label: 'warm lifestyle backlit',
    angle: '3/4 angle from slightly above',
    lens: '85mm portrait lens, aperture f/2.0',
    lighting: 'warm natural backlight (golden hour quality) with soft front fill, slight lens flare',
    composition: 'rule of thirds, product at left third, rich warm bokeh fills right side',
  },
  {
    label: 'dramatic rim-lit profile',
    angle: 'side profile — camera at 90° from the side',
    lens: '100mm telephoto, aperture f/2.8',
    lighting: 'cinematic rim lighting from directly behind the product + very subtle front fill, dramatic contrast',
    composition: 'product silhouette against gradient background, asymmetric, negative space dominant',
  },
  {
    label: 'bold hero angle',
    angle: 'three-quarter from slightly below — hero angle looking up at the product',
    lens: '50mm standard lens, aperture f/3.5',
    lighting: 'strong studio key from upper right, subtle fill from left, hard shadows',
    composition: 'product lower-left, dramatic negative space upper-right, bold diagonal energy',
  },
]

function buildShotStyleDirective(): string {
  const s = SHOT_STYLES[Math.floor(Math.random() * SHOT_STYLES.length)]
  return `SHOT STYLE FOR THIS IMAGE — apply this exactly:
Camera angle: ${s.angle}
Lens & aperture: ${s.lens}
Lighting: ${s.lighting}
Composition: ${s.composition}
Style: ${s.label}`
}

function buildPromoDirective(brandBrain: BrandBrain): string {
  if (!brandBrain.special_offer && !brandBrain.discount) return ''
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTIVE PROMOTION — read carefully and apply to image
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${brandBrain.special_offer ? `SPECIAL OFFER / OCCASION: ${brandBrain.special_offer}` : ''}${brandBrain.discount ? `\nDISCOUNT / DEAL: ${brandBrain.discount}` : ''}

Classify each active field using the table below and apply the corresponding visual approach. The product stays the hero — the promo element is a supporting detail. NEVER add text, numbers, or percentage signs to the image.

CLASSIFICATION TABLE:

If SPECIAL OFFER / OCCASION is set → classify and apply one of:
  • Holiday/seasonal (Halloween, Christmas, Vianoce, Valentine, Easter, Summer/Leto, etc.)
    → Transform the full scene atmosphere: holiday-specific palette, lighting, and 1–2 thematic props.
      Halloween: deep orange + black, dramatic shadows, one small pumpkin or unlit candle
      Christmas/Vianoce: warm gold + deep green, pine branch or single ornament, soft star bokeh
      Valentine's Day/Valentín: deep rose + burgundy, soft romantic bokeh, one or two rose petals
      Easter/Veľká noc/Spring: bright pastels, natural light, small flower or painted egg
      Summer/Leto: bright warm light, vibrant saturated colors, outdoor or sunny setting
  • Event/campaign (Black Friday, flash sale, opening, anniversary)
    → Bold high-contrast composition, strong directional lighting, dramatic shadows, confident framing

If DISCOUNT / DEAL is set → classify and apply one of:
  • Quantity deal ("2 for 1", "buy 2", "bundle", "pair", "2 za cenu 1", etc.)
    → Show exactly that many units of the product together — side by side, stacked, or paired. The quantity itself tells the story.
  • Percentage or price deal ("% off", "half price", "€X off", "zľava", "discount")
    → No additional props. Keep the scene clean and unmodified — the discount is communicated in the caption only.
  • Free or trial offer ("free", "trial", "first month", "gratis", "zadarmo")
    → Open, welcoming, wide-framed composition. Soft inviting light, aspirational mood. No additional props needed.

If BOTH are set: apply the SPECIAL OFFER atmosphere/theme only. The discount does not add any visual element.

`
}

function buildPeopleRule(brandBrain: BrandBrain): string {
  return brandBrain.include_people === false
    ? `STRICT RULE — NO PEOPLE: Do NOT include any people, humans, persons, figures, hands, silhouettes, or body parts anywhere in the image. The scene must be entirely people-free — products, objects, and environment only. Your image_prompt MUST end with the phrase: "no people, no humans, no persons, no figures, no hands, no body parts, no silhouettes"`
    : `If the scene includes multiple people, each person MUST wear a visually distinct outfit — different colors, garment types, or styles. Never dress two people identically.`
}

const JSON_SCHEMA = (brandName: string) => `{
  "image_prompt": "...",
  "visual_concept": "...",
  "template_layers": {
    "title": "...",
    "subtitle": "...",
    "cta": "...",
    "brand_name": "${brandName}"
  }
}`

async function callClaude(prompt: string): Promise<AgentOutput> {
  const anthropic = getClient()
  let lastErr: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 5000 * attempt))
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })
      const raw = message.content[0].type === 'text' ? message.content[0].text : ''
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('No JSON object found in response')
      const parsed = JSON.parse(raw.slice(start, end + 1))
      return {
        image_prompt: parsed.image_prompt,
        visual_concept: parsed.visual_concept,
        template_layers: parsed.template_layers,
      }
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      // Retry on: overloaded (529), server errors (5xx), rate limit (429),
      // and any error without an HTTP status (JSON parse failure, empty response, network issue)
      if (!status || status === 429 || status >= 500) { lastErr = err; continue }
      // Don't retry on client errors (400 bad request, 401 auth, 403 forbidden)
      throw err
    }
  }
  throw lastErr
}

// ─── 1. Original — fully AI-generated concept ──────────────────────────────

export async function generateOriginalImagePrompt(
  brandBrain: BrandBrain,
  recentImagePrompts: string[] = [],
  brandContext?: BrandContext,
  feedback?: string,
  postMode: 'topics' | 'services' = 'topics'
): Promise<AgentOutput> {
  const avoidSection = recentImagePrompts.length > 0
    ? `\nRECENTLY USED IMAGE CONCEPTS — you MUST choose a completely different concept, subject, setting, and visual style from all of these:\n${recentImagePrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n`
    : ''

  const contextSection = brandContext?.examples.length
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CALIBRATION EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The following examples show the quality, specificity, and prose style your IMAGE_PROMPT must match.
Do NOT repeat any of these visual concepts — use them only to calibrate format and detail level.
${brandContext.examples.map((ex, i) => `
[Example ${i + 1}]
Visual concept: ${ex.visual_concept}
Image prompt excerpt: ${ex.image_prompt.slice(0, 420)}…`).join('\n')}
`
    : ''

  const prompt = `You are a world-class creative director and commercial photographer for the brand "${brandBrain.brand_name}".

${buildPromoDirective(brandBrain)}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THIS POST MUST BE ABOUT — read this first
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${postMode === 'services'
  ? `THIS IS A SERVICES POST. Build the entire concept around one specific service from the list below — show it in action, highlight its benefit, or demonstrate the experience. The service is the hero.

SERVICES to choose from:
${brandBrain.products}

For reference only (do not use as the main subject):
${brandBrain.post_topics}`
  : `THIS IS A CONTENT/TOPIC POST. Pick one topic from the approved list below and build the entire concept around it. This is content marketing that educates, inspires, or engages the audience around a relevant subject.

APPROVED POST TOPICS to choose from:
${brandBrain.post_topics}

For reference only:
${brandBrain.products}`}

NEVER create a post about anything outside the lists above. If you cannot connect the visual concept clearly to the assigned mode, pick a different subject from the same list.
${brandBrain.post_avoid ? `\nSTRICTLY FORBIDDEN — never reference these in any way:\n${brandBrain.post_avoid}\n` : ''}
PRODUCT VISUALISATION RULE — applies to ALL original (AI-only) posts:
Do NOT render specific physical products (bottles, jars, glasses, packages, tins, merchandise).
Even if a product is listed in Products/Services above, visualise it indirectly:
show natural ingredients in their environment, people benefiting from the product,
atmospheric lifestyle scenes, or evocative nature photography.
Physical products may only appear as the hero when a reference image is provided by the user.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${getBrandProfile(brandBrain)}
${contextSection}${avoidSection}
Your task: Generate three things for an Instagram ad post.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. IMAGE_PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write a single long-form, highly detailed image generation prompt as flowing descriptive prose (not bullet points), covering every layer of the scene with precision and sensory richness. Structure the description in this exact order:

① SUBJECT — Describe the main subject clearly: what it is, its key visual features, material, color. Keep it grounded.
${buildPeopleRule(brandBrain)}

② COMPOSITION & POSITIONING — How the subject sits in the frame: position, angle, camera height. Portrait/vertical 4:5 orientation.

③ PROPS & ENVIRONMENT — Maximum 1–2 props. A prop is only allowed if explicitly named or clearly implied by the brand's Products/Services or Post Topics above. Empty is better than invented. NEVER add water droplets, floating orbs, or abstract decorative elements unless the product is literally a liquid or beverage.

④ BACKGROUND — A real location, simple gradient, or natural setting that fits the brand's tone. Name colors specifically.

⑤ LIGHTING — Direction, quality (soft/hard), temperature (warm/cool), and main effect on the subject.

⑥ COLOR PALETTE — 3–5 dominant colors. Name them specifically.

⑦ MOOD & ATMOSPHERE — 2 evocative terms matching the brand's tone and post purpose.

⑧ ART STYLE — Photorealistic photography style fitting the brand's industry and tone.

⑨ ${buildShotStyleDirective()}
End with: "ultra-high resolution, no text, no words, no labels, no logos, no underglow, no neon ground lighting, no light strips beneath objects, no props unrelated to the scene subject."

Write as one cohesive paragraph of clear prose. Aim for 150–250 words. Less is more.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. VISUAL_CONCEPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1–2 sentence plain-language summary of what is actually in the image (e.g. "A jar of raw honey on a wooden surface with a honey dipper drizzling thick golden honey"). Passed to the caption writer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. TEMPLATE_LAYERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   - title: main headline (max 6 words, punchy, in ${brandBrain.language})
   - subtitle: supporting line (max 10 words, in ${brandBrain.language})
   - cta: call-to-action (max 4 words, in ${brandBrain.language})
   - brand_name: "${brandBrain.brand_name}"

Respond ONLY with valid JSON:
${JSON_SCHEMA(brandBrain.brand_name)}${feedback ? `\n\nPREVIOUS ATTEMPT REJECTED — validator feedback: ${feedback}\nCorrect these issues in your new version.` : ''}`

  return callClaude(prompt)
}

// ─── 2. Asset — single brand asset as reference ────────────────────────────

export async function generateAssetImagePrompt(
  brandBrain: BrandBrain,
  assetGuidance: AssetGuidance,
  recentImagePrompts: string[] = [],
  brandContext?: BrandContext,
  feedback?: string,
  postMode: 'topics' | 'services' = 'topics'
): Promise<AgentOutput> {
  const avoidSection = recentImagePrompts.length > 0
    ? `\nRECENTLY USED IMAGE CONCEPTS — you MUST choose a completely different concept, subject, setting, and visual style from all of these:\n${recentImagePrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n`
    : ''

  const contextSection = brandContext?.examples.length
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CALIBRATION EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The following examples show the quality, specificity, and prose style your IMAGE_PROMPT must match.
Do NOT repeat any of these visual concepts — use them only to calibrate format and detail level.
${brandContext.examples.map((ex, i) => `
[Example ${i + 1}]
Visual concept: ${ex.visual_concept}
Image prompt excerpt: ${ex.image_prompt.slice(0, 420)}…`).join('\n')}
`
    : ''

  const assetSection = assetGuidance.mode === 'auto'
    ? `\nBRAND ASSET GUIDANCE:\nThe brand has multiple uploaded assets that will be passed as reference images to the image generator. Craft a scene that naturally incorporates brand visual identity — products, packaging, or branded items — as the hero. The image generator will reference the brand's uploaded photos to maintain visual consistency.\n`
    : `\nBRAND ASSET TO INCORPORATE:\n${
        assetGuidance.type === 'place_photo'
          ? `The user's brand is set in a specific physical location. Here is a detailed visual description of that space:

"${assetGuidance.locationDescription || `A space matching the brand's industry and identity`}"
${assetGuidance.description ? `\nLOCATION DETAILS — MANDATORY: These specific facts about this location MUST be reflected in the atmosphere and purpose of your scene:\n${assetGuidance.description}\n` : ''}
ABSOLUTE PROHIBITION: Do NOT include TV screens, monitors, digital displays, billboards, picture frames, light boxes, hanging canvases, or any surface that shows an image of the location. The location IS the environment — it must never appear as an object within itself.
ALSO STRICTLY FORBIDDEN as the foreground subject: signs, signboards, hand-painted boards, educational panels, fact boards, illustrated panels, naturalist boards, informational posters, chalkboards, printed cards, banners, placards, or any form of written or illustrated display object. The foreground subject must be a real living creature, a physical product, or an active scene — never a sign or board of any kind.

Your IMAGE_PROMPT MUST begin with: "Using the attached reference image as the environment and setting — faithfully recreate the atmosphere, space, and visual character of this location as the backdrop for the scene described below —"

After that opening, structure the IMAGE_PROMPT as:
① Establish the environment from inside: describe its exact colors, materials, lighting, and character using the details above (2–3 sentences) — the camera is shooting from within the space, not looking at a photo of it
② Describe the foreground subject: ${brandBrain.include_people === false ? 'a brand-relevant product, animal, or natural subject occupying the center of the frame — do NOT include any people or human figures, and do NOT use any sign, board, or display as the subject' : 'the brand-relevant person, animal, activity, or product occupying the center of the frame — do NOT use any sign, board, or display as the subject'} — if any branded product appears, its label, logo, and branding must remain exactly as shown; do NOT strip or alter any brand marks
③ Camera angle and depth of field — background environment should be naturally visible but out of focus behind the subject
④ End with: "ultra-high resolution, editorial photography, no digital screens, no monitors, no digital displays, no underglow, no neon ground lighting, no light strips beneath objects"\n`
          : assetGuidance.type === 'product_photo'
          ? `The user has selected a PRODUCT PHOTO as the reference image. This is an actual photograph of the brand's physical product and will be passed to NanoBanana alongside your prompt.
${assetGuidance.description ? `PRODUCT DETAILS — MANDATORY: These specific facts about this product MUST be reflected in your image_prompt and visual_concept — do NOT generate a generic product shot that ignores these details:\n${assetGuidance.description}\n` : ''}
Your entire IMAGE_PROMPT must be a world-class PRODUCT PHOTOGRAPHY brief. The product from the reference photo is the absolute hero.

Your IMAGE_PROMPT MUST begin with: "Using the attached reference image as the product — reproduce the product with absolute precision: its exact colors, materials, textures, finish, shape, construction, stitching, hardware, branding marks, and every visual detail exactly as shown in the reference, without any simplification, redesign, recoloring, or omission — placed in the scene described below —"

After that opening, describe ONLY:
① The product's placement and angle in the shot (center-frame, slight 3/4 angle, straight-on, etc.)
② The surface the product rests on (e.g. "a dark walnut wood surface", "matte black stone slab", "linen cloth")
③ The background (studio gradient, blurred bokeh, or simple neutral setting)
④ The lighting setup — quality, direction, and temperature only

ABSOLUTE RULES:
- The reference product is the ONLY object in the frame. Do NOT add any other objects, bottles, glasses, containers, food, decorations, candles, or props of any kind — not even as "context" or "atmosphere".
- Do NOT describe, name, or paraphrase any text, words, or design elements on the label — the reference image provides these; Gemini must copy them exactly
- Do NOT invent or add any visual element not visible in the reference photo
- Do NOT mention any brand name in the context of label design
- PRESERVE THE EXACT COLOR PALETTE: every color on the product must match the reference image exactly — do NOT alter, lighten, darken, or substitute any color; if the product is black, it must be black; if it has red stitching, the stitching must be red; no exceptions
- PRESERVE EXACT MATERIALS AND TEXTURES: fabric weave, leather grain, nylon sheen, matte/glossy finish, stitching pattern — all must appear exactly as in the reference photo
End the IMAGE_PROMPT with: "ultra-high resolution, product photography, commercial quality, no additional objects, no props, no bottles, no glasses, no containers, no food items, no candles, no decorations, no underglow, no neon ground lighting, no light strips beneath objects"\n`
          : assetGuidance.type === 'photo'
          ? `The user has selected a SCENE / ENVIRONMENT PHOTO as the reference image. This is a real photo of the brand's physical location, environment, or lifestyle setting, and will be passed to NanoBanana alongside your prompt.
${assetGuidance.locationDescription ? `\nSCENE ANALYSIS (from the reference image): "${assetGuidance.locationDescription}"\n` : ''}${assetGuidance.description ? `SCENE DETAILS — MANDATORY: These specific details about this scene MUST inform your image_prompt and the mood you create:\n${assetGuidance.description}\n` : ''}
Your IMAGE_PROMPT must use this photo as the actual scene — recreate or build upon the real environment shown. Do NOT put this photo inside any object, jar, frame, or product. Do NOT treat it as a label or graphic.
STRICTLY FORBIDDEN as the foreground subject: signs, signboards, hand-painted boards, educational panels, fact boards, illustrated panels, informational posters, chalkboards, printed cards, banners, or any written/illustrated display object. The foreground must be a living creature, active person, or physical product — never a sign or board.

Your IMAGE_PROMPT MUST begin with: "Using the attached reference image as the environment and setting — faithfully recreate the atmosphere, space, and visual character of this location as the backdrop for the scene described below —"

After that opening, describe:
① Establish the environment from the analysis above (2–3 sentences) — describe it as the backdrop the camera is shooting in front of
② What is happening in the scene — the brand activity, product in use, or living moment that fits the brand's topics and tone (never a sign or display)
③ ${brandBrain.include_people === false ? 'Any product, animal, or natural subject in the foreground (NO people or human figures, NO signs or boards)' : 'Any people, animal, or subject in the foreground (if relevant) — NO signs or boards'}, clearly distinct from the background
④ The lighting as it appears in the reference photo — preserve its quality and temperature
End the IMAGE_PROMPT with: "ultra-high resolution, authentic atmosphere, no digital screens, no text overlays, no underglow, no neon ground lighting, no light strips beneath objects, no unrelated props"\n`
          : assetGuidance.type === 'screenshot'
          ? `The user has uploaded an APP SCREENSHOT as the reference image. This screenshot will be passed to NanoBanana alongside your prompt.

Your IMAGE_PROMPT must describe a cinematic tech product mockup photograph: the reference screenshot displayed on a sleek modern laptop (MacBook-style, silver aluminium, open lid) placed on a dark surface. The screen must be clearly legible — not at a steep isometric angle.

Your IMAGE_PROMPT MUST begin with: "Using the attached reference image as the laptop screen content — display this exact screenshot on the screen of a sleek open laptop —"

After that opening, describe:
① The laptop: modern silver/aluminium MacBook-style laptop, lid open at approximately 110–120 degrees, the reference screenshot filling the screen cleanly and legibly
② Placement and angle: laptop centred in frame, slight 3/4 perspective with the camera at roughly screen height — NOT a steep isometric top-down tilt; the screen UI should be comfortably readable
③ Surface: dark walnut wood desk, dark marble slab, or matte dark table
④ Background: dark and moody, out-of-focus, with soft warm bokeh ambient lights in the far background (evening office or café atmosphere)
⑤ Lighting: soft directional light from slightly front-left or front-right, gently illuminating the keyboard and bezel, deep shadows on the desk surface
End the IMAGE_PROMPT with: "ultra-high resolution, professional tech product photography, no text overlays, no additional devices, no props, no underglow, no neon ground lighting, no light strips beneath objects"\n`
          : `The user has selected a specific brand asset. This exact asset image will be passed as a reference image to NanoBanana alongside your prompt.
${assetGuidance.description ? `ASSET DETAILS — MANDATORY: Apply these specific facts when building the scene:\n${assetGuidance.description}\n` : ''}
CRITICAL PLACEMENT RULE: This asset is a label, logo, sticker, or packaging graphic. You MUST place it applied onto the appropriate physical product — infer the product from the brand's industry (e.g. a honey label goes on a honey jar, a coffee label on a bag or cup, a skincare label on a bottle or tin). Do NOT float it as a standalone object, lean it against a surface, or treat it as a decorative prop.

Your IMAGE_PROMPT MUST begin with: "Using the attached reference image exactly as provided without any alterations, modifications, or reinterpretation — every detail, color, typography, shape, and graphic element of the reference must appear pixel-faithfully as a label/print on the product described below, with zero redesign or simplification —"

After that opening, describe ONLY:
① The physical product the asset is applied to (e.g. "a 350ml amber glass honey jar with a metal lid") — shape, material, size, and finish
② How the asset is applied (wrapped label, front-face sticker, printed directly) and its position on the product
③ The surrounding scene, props, surface, background
④ The lighting setup

ABSOLUTE RULES:
- Do NOT describe, name, or paraphrase any visual content of the asset itself — it appears exactly as the reference shows
- Do NOT simplify, redesign, or omit any part of the label/logo\n`
      }`

  const prompt = `You are a world-class creative director and commercial photographer for the brand "${brandBrain.brand_name}".

${buildPromoDirective(brandBrain)}${
  assetGuidance.mode === 'auto' || assetGuidance.type === 'place_photo' || assetGuidance.type === 'photo'
  ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOREGROUND SUBJECT — choose from the lists below
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The visual environment is defined by the reference image. Choose what activity or subject appears in the foreground.

${postMode === 'services'
  ? `THIS IS A SERVICES POST. Choose one service as the foreground subject.\n\nSERVICES to choose from:\n${brandBrain.products}\n\nFor reference only:\n${brandBrain.post_topics}`
  : `THIS IS A CONTENT/TOPIC POST. Choose one topic as the foreground subject.\n\nAPPROVED TOPICS:\n${brandBrain.post_topics}\n\nFor reference only:\n${brandBrain.products}`}
${brandBrain.post_avoid ? `\nSTRICTLY FORBIDDEN — never reference these in any way:\n${brandBrain.post_avoid}\n` : ''}`
  : `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENCE ASSET IS THE SUBJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user has uploaded their own asset. It is the sole subject — do NOT substitute it with any brand brain product or topic. Follow the asset instructions below exactly.
${brandBrain.post_avoid ? `\nSTRICTLY FORBIDDEN — never reference these:\n${brandBrain.post_avoid}\n` : ''}`
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${getBrandProfile(brandBrain)}
${contextSection}${avoidSection}${assetSection}
Your task: Generate three things for an Instagram ad post.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. IMAGE_PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write a single long-form, highly detailed image generation prompt as flowing descriptive prose (not bullet points), following the BRAND ASSET instructions above precisely. Structure the description covering:

① SUBJECT — The asset/product as described above. Follow the mandatory opening sentence if specified.
${buildPeopleRule(brandBrain)}

② COMPOSITION & POSITIONING — Position, angle, camera height. Portrait/vertical 4:5 orientation.

③ PROPS & ENVIRONMENT — Maximum 1–2 props directly relevant to the product. Empty is better than invented.

④ BACKGROUND — Named colors. Real location or clean studio setting matching the brand tone.

⑤ LIGHTING — Direction, quality, temperature, and effect on the product.

⑥ COLOR PALETTE — 3–5 dominant colors, named specifically.

⑦ MOOD & ATMOSPHERE — 2 evocative terms.

⑧ ART STYLE — Photorealistic commercial photography.

⑨ ${assetGuidance.type === 'place_photo' || assetGuidance.type === 'photo'
  ? 'CAMERA ANGLE & PERSPECTIVE — Match the camera angle, height, and framing of the reference photo. The shot must feel like it was taken from within the same environment, not from above or as a flat lay.'
  : buildShotStyleDirective()}
End with the mandatory closing line specified in the asset instructions above.

One cohesive paragraph, 150–250 words.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. VISUAL_CONCEPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1–2 sentence plain-language summary of what is actually in the image. Passed to the caption writer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. TEMPLATE_LAYERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write these specifically about the asset featured in this post — not generic brand copy:
   - title: punchy headline about the featured product (max 6 words, in ${brandBrain.language})
   - subtitle: supporting line relevant to this specific asset (max 10 words, in ${brandBrain.language})
   - cta: call-to-action (max 4 words, in ${brandBrain.language})
   - brand_name: "${brandBrain.brand_name}"

Respond ONLY with valid JSON:
${JSON_SCHEMA(brandBrain.brand_name)}${feedback ? `\n\nPREVIOUS ATTEMPT REJECTED — validator feedback: ${feedback}\nCorrect these issues in your new version.` : ''}`

  return callClaude(prompt)
}

// ─── 3. Composite — two assets: scenic + product ───────────────────────────

export async function generateCompositeImagePrompt(
  brandBrain: BrandBrain,
  assetGuidance: AssetGuidance,
  feedback?: string
): Promise<AgentOutput> {
  const prompt = `You are a world-class commercial photographer and creative director specializing in luxury product advertising. You are creating an image generation brief for the brand "${brandBrain.brand_name}".

BRAND: ${brandBrain.brand_name}
Products: ${brandBrain.products}
Tone: ${brandBrain.tone_keywords?.join(', ')}
Language: ${brandBrain.language}
${brandBrain.post_avoid ? `Never reference: ${brandBrain.post_avoid}\n` : ''}${buildPromoDirective(brandBrain)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPOSITE BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TWO REFERENCE IMAGES ARE ATTACHED:
— Reference image 1: THE PRODUCT — the exact item to be placed into the scene (the hero)
— Reference image 2: THE SCENE — the exact physical location and environment (the backdrop)

PRODUCT: the brand's product shown in reference image 2
${assetGuidance.productDescription ? `PRODUCT DETAILS — MANDATORY: These specific facts about this product MUST be reflected in your image_prompt and visual_concept:\n${assetGuidance.productDescription}\n` : ''}SCENE ANALYSIS (from reference image 2): "${assetGuidance.locationDescription || 'a real physical location — reproduce it exactly as shown'}"
${assetGuidance.description ? `SCENE DETAILS — MANDATORY: These specific facts about this location MUST be reflected in the atmosphere of your image:\n${assetGuidance.description}\n` : ''}
Your IMAGE_PROMPT must produce a world-class cinematic advertisement — the product from reference image 1 as the dramatic, brilliantly lit hero filling the frame, with the environment from reference image 2 as the atmospheric backdrop. The product is the sole subject: it must dominate the frame exactly as it appears in the reference — whether that is a car, a bottle, a piece of equipment, or any other object. Do NOT substitute it with a smaller or associated object (e.g. do NOT replace a car with a car key, do NOT replace a coffee machine with a coffee cup).

The IMAGE_PROMPT MUST begin with exactly this sentence: "Reference image 1 is ${assetGuidance.productName || 'the product'} — photograph the exact object shown in reference image 1 as the absolute hero, preserving every detail of its appearance, shape, color, and finish precisely as shown; do NOT substitute it with any other object, accessory, or associated item. Reference image 2 is the location and environment — use its colors, architectural character, and atmosphere as the background behind the product; the scene appears softly out of focus, providing depth and environmental context without becoming the main subject."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. IMAGE_PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${buildPeopleRule(brandBrain)}

After that mandatory opening, write a single flowing paragraph of rich, cinematic prose (200–300 words) — not bullet points. Cover all of the following in one cohesive description:

CREATIVE DIRECTION — read this first: Study both reference images and choose the lighting style, mood, and atmosphere that would make the most visually striking and commercially compelling advertisement for this specific product in this specific environment. Do not default to any one style — let the combination of scene and product guide you. A bright outdoor terrace calls for a different treatment than a dark industrial space; a glass bottle calls for different lighting than a matte cardboard package. Choose deliberately and describe your choice with full conviction.

PRODUCT PLACEMENT: The exact product from reference image 1 — reproduced faithfully at its actual scale and form — positioned in the foreground using rule of thirds. Dominant, slightly off-center. Choose the angle that makes it look most compelling: 3/4 rotation, straight-on, or low-angle — whichever reveals its true shape and character best. The product occupies 45–65% of the frame height.

SURFACE & GROUNDING: Choose the most visually compelling solid surface present in reference image 2 — prioritize horizontal surfaces with texture and character: a wooden plank, stone slab, shelf ledge, or countertop. Avoid bare ground, dirt, or gravel. The product MUST physically rest on this surface with full contact — no gap between base and surface. The surface texture must visibly continue beneath the product's base. Render a soft contact shadow at the base perimeter that confirms physical weight.

LIGHTING: Design a complete cinematic lighting setup that draws its color temperature and mood from the scene's atmosphere but enhances it dramatically. Use the scene's ambient light as the foundation — identify its temperature (cool overcast, warm golden hour, dappled shade) and let it inform every light. Then add: a purposeful key light that creates a compelling highlight on the product's dominant surface; a subtle fill preserving shadow detail; a rim or edge light that separates the product from the background. For glass and liquids specifically: the key light must pass through or refract within the liquid, creating an internal luminosity. The lighting must feel as if it belongs to this place and time — cinematic and intentional, not flat or accidental. The product must look as though it was physically placed in that location and photographed with deliberate craft.

ATMOSPHERE: Add 1–2 subtle atmospheric details that arise naturally from the scene's character and enhance the mood — fine particles, mist, steam, caustic reflections, bokeh light scatter — whatever genuinely fits this specific location and product.

BACKGROUND: Elements from reference image 2 appear behind the product — softly dissolved into bokeh (f/2.8), providing environmental depth and color context without competing for attention. The scene is the atmosphere, not the subject.

MATERIAL RENDERING: Describe the product's physical material with hyper-realistic precision — glass transparency and internal light refraction, liquid viscosity, metallic highlights, label legibility, packaging tactile detail. Every surface rendered with photographic physical accuracy.

COLOR PALETTE: Name 5–7 specific, painterly colors drawn from both the scene and the product as lit. Use precise terms — never generic descriptors like "warm" or "dark".

CAMERA: Choose the angle and lens that makes this specific product look most beautiful — low angle, straight-on, or gentle 3/4 rotation. Full-frame camera, 85–100mm lens, aperture f/2.8. Product razor-sharp. Background dissolved into beautiful bokeh. 4:5 vertical Instagram format.

End the IMAGE_PROMPT with: "ultra-photorealistic commercial product photography, advertising-ready, magazine quality, product firmly resting on a visible surface with full contact, natural contact shadow beneath confirming physical grounding, no floating, no levitating, no suspension in mid-air, no text overlays, no added props not visible in the reference images, no underglow, no neon ground lighting, no light strips beneath objects"

ABSOLUTE PROHIBITIONS:
— Do NOT substitute the product with any associated or related object — if the product is a car, show the car, NOT a car key, steering wheel, or badge; if it is a coffee machine, show the machine, NOT a cup; etc.
— Do NOT make the scene the main subject — it is a dark atmospheric backdrop only
— Do NOT add signage, text overlays, screens, monitors, or digital displays
— Do NOT alter the product's label, shape, logo, or any branding detail
${brandBrain.include_people === false ? '— Do NOT include any people, humans, persons, figures, hands, or body parts — the scene must be entirely people-free\n' : ''}The product's label and branding must remain fully visible and legible.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. VISUAL_CONCEPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1–2 plain-language sentences describing what is visible in the finished image (e.g. "A glass honey jar placed on a mossy stone terrace, softly backlit by golden afternoon light, with the blurred foliage of the garden in the background"). Passed to the caption writer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. TEMPLATE_LAYERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Text overlays for the design — write these specifically about the product featured in the scene, not generic brand copy:
   - title: punchy headline about the product (max 6 words, in ${brandBrain.language})
   - subtitle: supporting benefit or mood line relevant to this specific product (max 10 words, in ${brandBrain.language})
   - cta: call-to-action (max 4 words, in ${brandBrain.language})
   - brand_name: "${brandBrain.brand_name}"

Respond ONLY with valid JSON:
${JSON_SCHEMA(brandBrain.brand_name)}${feedback ? `\n\nPREVIOUS ATTEMPT REJECTED — validator feedback: ${feedback}\nCorrect these issues in your new version.` : ''}`

  return callClaude(prompt)
}

// ─── 4. Product Photo — dedicated product photography prompt ────────────────

export interface ProductPhotoPromptInput {
  assetGuidance: AssetGuidance
  settings: Partial<SceneSettings>
}

function describeLightingDirection(deg: number): string {
  if (deg < 22.5 || deg >= 337.5) return 'from directly above'
  if (deg < 67.5)  return 'from the top-right'
  if (deg < 112.5) return 'from the right'
  if (deg < 157.5) return 'from the bottom-right'
  if (deg < 202.5) return 'from directly below'
  if (deg < 247.5) return 'from the bottom-left'
  if (deg < 292.5) return 'from the left'
  return 'from the top-left'
}

function describeValue(v: number, low: string, mid: string, high: string, threshold = 25): string {
  if (v < -threshold) return low
  if (v > threshold)  return high
  return mid
}

export async function generateProductPhotoPrompt(
  brandBrain: BrandBrain,
  input: ProductPhotoPromptInput
): Promise<{ image_prompt: string }> {
  const { assetGuidance, settings: s } = input
  const isComposite = assetGuidance.mode === 'composite'

  // ── Translate SceneSettings into natural-language directives ──
  const intensity  = s.lightingIntensity ?? 70
  const direction  = s.lightingDirection ?? 45
  const lType      = s.lightingType ?? 'soft'
  const temp       = s.colorTemperature ?? 0
  const sat        = s.saturation ?? 0
  const contrast   = s.contrast ?? 0
  const exposure   = s.exposure ?? 0
  const sceneType  = s.sceneType ?? 'studio'
  const bgType     = s.backgroundType ?? 'color'
  const position   = s.productPosition ?? 'center'
  const zoom       = s.zoom ?? 100
  const angle      = s.viewAngle ?? 'front'
  const elements   = s.elements ?? []
  const customP    = s.customPrompt?.trim() ?? ''

  const lightingDesc = [
    `${lType} light ${describeLightingDirection(direction)}`,
    `intensity: ${intensity < 33 ? 'dim and moody' : intensity < 66 ? 'moderate' : 'bright and punchy'} (${intensity}%)`,
  ].join(', ')

  const temperatureDesc = describeValue(temp, 'warm golden tones', 'neutral white balance', 'cool blue-tinted tones')
  const saturationDesc  = describeValue(sat, 'desaturated, muted palette', 'natural saturation', 'richly saturated, vivid colors')
  const contrastDesc    = describeValue(contrast, 'low contrast, flat and airy', 'balanced contrast', 'high contrast, deep blacks and bright highlights')
  const exposureDesc    = describeValue(exposure, 'underexposed, dark and moody', 'correctly exposed', 'overexposed, bright and airy')

  const sceneDesc = sceneType === 'custom' && s.sceneCustom?.trim()
    ? s.sceneCustom.trim()
    : { studio: 'clean professional studio', outdoor: 'outdoor natural environment', interior: 'interior lifestyle setting', custom: 'custom environment' }[sceneType] ?? 'studio'

  // Build a rich atmospheric background description so the model renders depth,
  // not a flat painted wall. Even "solid color" studio backdrops need vignette and gradient.
  function describeBg(): string {
    if (bgType === 'color') {
      const hex = s.backgroundColor ?? '#1a1410'
      return `deep studio backdrop in the hue of ${hex} — not a flat wall, but a seamless paper sweep with a subtle center-bright hot spot fading to a darker vignette at the edges and corners, giving natural depth and atmosphere; the background transitions smoothly from a slightly lighter center to a noticeably darker perimeter`
    }
    if (bgType === 'gradient') {
      const from = s.backgroundGradientFrom ?? '#2a1f0e'
      const to   = s.backgroundGradientTo   ?? '#0d0b07'
      return `seamless gradient studio backdrop sweeping from ${from} at the top/center to ${to} at the bottom/edges — smooth, photographic, no visible banding, with a shallow depth-of-field atmospheric softness`
    }
    if (bgType === 'ai') {
      return `AI-generated atmospheric background: ${s.backgroundAiPrompt?.trim() || 'cinematic moody studio backdrop'} — richly rendered with depth, subtle bokeh where applicable, and natural light falloff`
    }
    if (bgType === 'photo') {
      return `real environment defined by the provided background reference photo${s.backgroundPhotoName ? ` ("${s.backgroundPhotoName}")` : ''} — match its depth of field, light quality, and atmosphere faithfully`
    }
    return 'clean neutral studio backdrop with subtle vignette and depth'
  }
  const bgDesc = describeBg()

  // When a real background photo is provided it IS the scene — suppress sceneType to avoid contradiction
  const sceneLine = bgType === 'photo'
    ? `SCENE: defined entirely by the provided background reference photo${s.backgroundPhotoName ? ` ("${s.backgroundPhotoName}")` : ''} — match its lighting, depth, and atmosphere`
    : `SCENE: ${sceneDesc}`

  const compositionDesc = [
    `product placed ${position === 'left' ? 'in the left third of the frame' : position === 'right' ? 'in the right third of the frame' : 'centered in the frame'}`,
    `zoom: ${zoom < 75 ? 'wide shot, generous environment visible' : zoom > 125 ? 'tight close-up, product fills most of the frame' : 'medium shot'} (${zoom}%)`,
    `camera angle: ${angle === 'front' ? 'straight-on front view' : angle === 'three-quarter' ? '¾ turn rotation revealing depth' : angle === 'side' ? 'side profile view' : angle === 'top' ? 'overhead top-down view' : 'low angle looking up'}`,
  ].join('. ')

  const elementsDesc = elements.length > 0
    ? `Scene elements to include: ${elements.filter(e => e.name.trim()).map(e => e.name).join(', ')}.`
    : ''

  // ── Asset block ──
  const assetBlock  = isComposite
    ? `REFERENCE IMAGE 1 (SCENE/ENVIRONMENT):
${assetGuidance.locationDescription ? `Environment analysis: ${assetGuidance.locationDescription}` : ''}

REFERENCE IMAGE 2 (PRODUCT):
${assetGuidance.productPhysicalDescriptionComposite ? `Physical form: ${assetGuidance.productPhysicalDescriptionComposite}` : ''}
${assetGuidance.productDescription ? `User note: ${assetGuidance.productDescription}` : ''}

Place the product from reference image 2 inside the scene from reference image 1. Reproduce the product exactly — every label, color, shape, and material must match the reference precisely.`
    : `REFERENCE IMAGE:
${assetGuidance.productPhysicalDescription ? `Physical form (from vision analysis): ${assetGuidance.productPhysicalDescription}` : ''}
${assetGuidance.description ? `User note: ${assetGuidance.description}` : ''}
Reproduce this exact product in the output — every label, color, shape, and material must match the reference precisely.`

  // When the user requests a non-front angle, make the override unambiguous in the opening sentence
  const angleLabel: Record<string, string> = {
    'three-quarter': 'a ¾ three-quarter angle revealing depth',
    'side':          'a pure side profile view — camera at 90° from the front, the product facing sideways',
    'top':           'an overhead top-down view — camera directly above',
    'low':           'a low angle looking upward at the product',
  }
  const angleOverride = angle !== 'front'
    ? ` — IMPORTANT: rotate the product to show ${angleLabel[angle] ?? angle}, regardless of the angle shown in the reference image; the reference defines the product's visual appearance only (label artwork, colors, shape, material), NOT the camera angle`
    : ''

  const prompt = `You are a world-class commercial product photographer and AI image prompt engineer. Write a Gemini image generation prompt. A reference image of the product is attached — the prompt MUST anchor the output to that reference so the product appears exactly as shown.

BRAND CONTEXT:
Industry: ${brandBrain.industry}

ASSET CONTEXT:
${assetBlock}

PHOTOGRAPHY SPECIFICATIONS:

${sceneLine}
BACKGROUND: ${bgDesc}

LIGHTING: ${lightingDesc}
COLOR TEMPERATURE: ${temperatureDesc}
SATURATION: ${saturationDesc}
CONTRAST: ${contrastDesc}
EXPOSURE: ${exposureDesc}

COMPOSITION: ${compositionDesc}
${elementsDesc}
${customP ? `ADDITIONAL INSTRUCTIONS: ${customP}` : ''}

Write a single flowing paragraph (200–270 words) of commercial product photography prose. Structure it as follows:

1. Open with: "Reproduce the exact product from the attached reference image with every detail of its label artwork, packaging colors, printed design, shape, and material finish appearing identical to the reference${assetGuidance.productPhysicalDescription || assetGuidance.productPhysicalDescriptionComposite ? ` — the product is ${assetGuidance.productPhysicalDescription ?? assetGuidance.productPhysicalDescriptionComposite}` : ''}${angleOverride}." Then reinforce: the reference image defines the product's visual appearance only — its colors, labels, shape, and material; the camera angle is determined by the COMPOSITION specification above, not by the angle shown in the reference.

2. Continue with the scene, lighting, and background: describe the background in rich atmospheric detail (depth, vignette, light quality, not just a flat color). Describe the lighting setup — key light direction, quality (${lType}), how it wraps the product surface, where the specular highlight lands, how the shadow falls. Describe the color grading mood.

3. Describe composition and any scene elements.

4. End with: "ultra-photorealistic commercial product photography, full-frame 85mm f/2.8, 4:5 vertical Instagram format, product appearance identical to reference image, no text overlays, no watermarks, no underglow, no neon ground lighting, no light strips beneath objects"

ABSOLUTE PROHIBITIONS:
— Do NOT name any brand (not even "${brandBrain.brand_name}")
— Do NOT describe, invent, or alter any label text, logo, or printed artwork on the product
— Do NOT change the product's shape, proportions, color scheme, or material finish from what the reference shows
— Do NOT add accessories or props beyond the specified scene elements
${brandBrain.include_people === false ? '— Do NOT include people, hands, or body parts\n' : ''}
Respond ONLY with valid JSON: { "image_prompt": "..." }`

  const anthropic = getClient()
  let lastErr: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 5000 * attempt))
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      })
      const raw   = message.content[0].type === 'text' ? message.content[0].text : ''
      const start = raw.indexOf('{')
      const end   = raw.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('No JSON in response')
      const parsed = JSON.parse(raw.slice(start, end + 1))
      return { image_prompt: parsed.image_prompt }
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (!status || status === 429 || status >= 500) { lastErr = err; continue }
      throw err
    }
  }
  throw lastErr
}
