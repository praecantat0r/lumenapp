import Anthropic from '@anthropic-ai/sdk'
import type { BrandBrain } from '@/types'
import type { BrandContext } from '@/lib/context-builder'

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

export async function generateCaption(brandBrain: BrandBrain, visualConcept: string, brandContext?: BrandContext, feedback?: string): Promise<{ caption: string; hashtags: string }> {
  const systemPrompt = `You are a professional Instagram copywriter for the brand "${brandBrain.brand_name}".

BRAND PROFILE:
- Industry: ${brandBrain.industry}
- Description: ${brandBrain.brand_description}
- Products/Services: ${brandBrain.products}
- Target Audience: ${brandBrain.target_audience}
- Audience Problem: ${brandBrain.audience_problem}
- Brand Tone: ${brandBrain.tone_keywords?.join(', ')} — ${brandBrain.tone_description}
- Topics to cover: ${brandBrain.post_topics}
- Never mention: ${brandBrain.post_avoid}
- Slogans: ${brandBrain.slogans || 'None'}
- Language: ${brandBrain.language}
${brandBrain.content_ratio ? `- Content mix strategy: ${brandBrain.content_ratio}\n` : ''}${brandBrain.scraped_taglines?.length ? `- Additional taglines from brand website: ${brandBrain.scraped_taglines.join(' · ')}\n` : ''}${brandBrain.scraped_about ? `- About the brand (from their website): ${brandBrain.scraped_about}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPTION STRUCTURE — follow this exactly every time:

1. HOOK (first sentence — the most important line)
   - Must stop the scroll and make the reader want to tap "see more"
   - Use one of these forms: a bold question, a surprising fact, or a provocative/intriguing statement
   - Must be short, punchy, and immediately relevant to the image
   - Do NOT start with the brand name or a generic greeting

2. BODY (2–3 short paragraphs)
   - Each paragraph max 2–3 lines — no long blocks of text
   - Deliver real value: a story, an insight, a concrete benefit, or a relatable moment
   - Keep it directly tied to what the image shows

3. CALL TO ACTION (last line)
   - Always end with a clear, natural CTA that invites engagement
   - Vary the type: ask a question ("Čo si o tom myslíš?"), prompt saving ("Ulož si to"), encourage sharing, or invite a visit/order
   - Match the CTA to the post goal — sales post → buy/visit/order; educational → save/share; engagement → comment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT TYPE AWARENESS — pick the type that fits the image and brand goal:
- Educational: tips, how-it-works, interesting facts
- Sales: product/service presentation with clear benefit
- Brand-building: values, atmosphere, behind-the-scenes feel
- Engagement: relatable moment, opinion prompt, question

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rules to follow:
1. Write only about what the brand actually offers as listed in Products/Services above. Do not infer or add products not mentioned.
2. Ground the caption in the scene description provided below. Write about what the scene describes.
3. The example captions below are for tone and voice calibration only — do not copy their subject matter.
4. Do not invent discounts, promotions, or percentages — only use what is explicitly provided.
5. Write only in ${brandBrain.language}. Do not mix in other languages.
6. Use short paragraphs separated by blank lines. Keep it readable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HASHTAG RULES:
- Use 8–12 hashtags (optimal range for reach without looking spammy)
- Mix: 2–3 large/broad hashtags + 3–5 medium niche hashtags + 3–4 small/local/specific hashtags
- All hashtags must be directly relevant to the content and audience
- No spam hashtags (#like4like, #follow4follow, #instagood used generically, etc.)
- Do NOT repeat the same hashtag set every post — vary based on the specific content
- Hashtags should reflect both the content AND the target audience's interests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${brandContext?.examples.length ? `
CAPTION EXAMPLES — calibrate VOICE and TONE only. Do NOT copy. Do NOT reference these products or visuals.
${brandContext.examples.map((ex, i) => `
[Example ${i + 1}]
${ex.caption}`).join('\n---')}
` : ''}`

  const promoRequirement = (brandBrain.special_offer || brandBrain.discount)
    ? `\nPromotion to include:${brandBrain.special_offer ? `\n- Seasonal/holiday context: "${brandBrain.special_offer}" — weave this naturally into the caption.` : ''}${brandBrain.discount ? `\n- Discount: "${brandBrain.discount}" — include this exactly as written.` : ''}\nDo not invent any other discounts or offers.\n`
    : `\nNo active promotions — do not mention any discounts, percentages, or special offers.\n`

  const userPrompt = `Write an Instagram caption for ${brandBrain.brand_name}.

POST SCENE DESCRIPTION: ${visualConcept}
The caption must be directly inspired by and relevant to this scene.
${promoRequirement}
Follow the 3-part structure: Hook → Body → Call to Action.
- Language: ${brandBrain.language}
- Tone: ${brandBrain.tone_keywords?.join(', ')}

Then on a new line write: HASHTAGS: followed by 8–12 relevant hashtags (mix of broad, niche, and local).

Format your response as:
CAPTION:
[caption text here]

HASHTAGS:
#hashtag1 #hashtag2 ...${feedback ? `\n\nPREVIOUS ATTEMPT FEEDBACK: ${feedback}\nAddress these issues in your new version.` : ''}`

  const client = getClient()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 900,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  const captionMatch = text.match(/CAPTION:\s*([\s\S]*?)(?=HASHTAGS:|$)/)
  const hashtagsMatch = text.match(/HASHTAGS:\s*([\s\S]*)$/)

  return {
    caption: captionMatch?.[1]?.trim() || text,
    hashtags: hashtagsMatch?.[1]?.trim() || '',
  }
}
