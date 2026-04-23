import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const TONES = ['Professional','Friendly','Inspiring','Authoritative','Playful',
               'Luxurious','Minimal','Bold','Warm','Humorous','Informative','Passionate']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`autofill:${user.id}`, 10, 60_000)) return rateLimitResponse()

  try {
    const body = await req.json()
    const {
      brand_name, industry, location,
      brand_description, products, slogans,
    } = body

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const systemPrompt = `You are a brand strategist helping set up a brand's social media presence.
Generate realistic, specific brand strategy data based on the information provided.
ALL text fields must be written in Slovak language (sk).
Respond ONLY with valid JSON matching the exact schema requested.`

    const userPrompt = `Brand details:
- Name: ${brand_name}
- Industry: ${industry}
- Location: ${location}
${brand_description ? `- Description: ${brand_description}` : ''}
${products ? `- Products/Services: ${products}` : ''}
${slogans ? `- Slogans: ${slogans}` : ''}

Generate the following brand strategy fields. All text must be in Slovak.

Available tone keywords (pick 1–3 that best fit): ${TONES.join(', ')}

Return JSON with exactly these keys:
{
  "tone_keywords": ["<tone1>", "<tone2>"],
  "tone_description": "<2–3 sentences describing brand voice in Slovak>",
  "target_audience": "<1–2 sentences describing target audience in Slovak>",
  "audience_problem": "<1 sentence describing the problem you solve in Slovak>",
  "post_topics": "<3–5 bullet points of content topics and formats in Slovak>",
  "post_avoid": "<2–3 things to never publish in Slovak>",
  "content_ratio": "<e.g. 60% produkty | 30% zákulisie | 10% akcie>",
  "posting_time": "<e.g. 9:00, 18:00>"
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0].message.content || '{}'
    const result = JSON.parse(raw)

    // Validate tone_keywords against known list
    if (Array.isArray(result.tone_keywords)) {
      result.tone_keywords = result.tone_keywords
        .filter((t: string) => TONES.includes(t))
        .slice(0, 3)
      if (result.tone_keywords.length === 0) result.tone_keywords = ['Professional']
    } else {
      result.tone_keywords = ['Professional']
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[autofill]', err)
    return NextResponse.json({ error: 'autofill failed' }, { status: 500 })
  }
}
