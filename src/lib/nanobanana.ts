import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase/service'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type ImagePart = { inline_data: { mime_type: string; data: string } }

export async function prefetchReferenceImages(urls: string[]): Promise<ImagePart[]> {
  const results = await Promise.all(
    urls.slice(0, 14).map(async (url): Promise<ImagePart | null> => {
      try {
        const res = await fetch(url)
        const buffer = Buffer.from(await res.arrayBuffer())
        const originalMime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
        const isPng = originalMime === 'image/png'
        const instance = sharp(buffer).resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        const resized = await (isPng ? instance.png({ compressionLevel: 8 }) : instance.jpeg({ quality: 80 })).toBuffer()
        return { inline_data: { mime_type: isPng ? 'image/png' : 'image/jpeg', data: resized.toString('base64') } }
      } catch {
        return null
      }
    })
  )
  return results.filter((p): p is ImagePart => p !== null)
}

async function generateWithDalle(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        response_format: 'b64_json',
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('DALL-E 3 error:', res.status, JSON.stringify(err))
      return null
    }

    const data = await res.json()
    const b64 = data?.data?.[0]?.b64_json
    if (!b64) return null
    return Buffer.from(b64, 'base64')
  } catch (err) {
    console.error('DALL-E 3 request failed:', err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function generateWithGemini(
  prompt: string,
  imageParts: ImagePart[]
): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const parts = [{ text: prompt }, ...imageParts]

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await sleep(attempt * 2000)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90_000)

      try {
        const res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              imageConfig: { aspectRatio: '4:5', imageSize: '1K' },
            },
          }),
          signal: controller.signal,
        })
        clearTimeout(timeout)

        const data = await res.json()

        if (res.status === 429 || res.status === 503) {
          if (attempt < 2) continue
          break
        }
        if (!res.ok) break

        const responseParts: { inlineData?: { mimeType: string; data: string } }[] =
          data?.candidates?.[0]?.content?.parts ?? []
        const imgPart = responseParts.find((p) => p.inlineData?.data)
        if (!imgPart?.inlineData) break

        return Buffer.from(imgPart.inlineData.data, 'base64')
      } catch {
        clearTimeout(timeout)
        break
      }
    }
  }

  return null
}

export async function generateImage(
  prompt: string,
  referenceImageUrls: string[] = [],
  prefetchedImages?: ImagePart[]
): Promise<string> {
  // Try DALL-E 3 first — no reference images needed, just the prompt
  const dalleBuffer = await generateWithDalle(prompt)

  let imageBuffer: Buffer
  let mimeType: string

  if (dalleBuffer) {
    imageBuffer = dalleBuffer
    mimeType = 'image/png'
  } else {
    // Fall back to Gemini with reference images
    const imageParts = prefetchedImages ?? await prefetchReferenceImages(referenceImageUrls)
    const geminiBuffer = await generateWithGemini(prompt, imageParts)
    if (!geminiBuffer) throw new Error('Image generation failed: both DALL-E 3 and Gemini unavailable')
    imageBuffer = geminiBuffer
    mimeType = 'image/png'
  }

  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png'
  const supabase = createServiceClient()
  const filePath = `generated/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('generated-images')
    .upload(filePath, imageBuffer, { contentType: mimeType, upsert: false })

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  const { data: { publicUrl } } = supabase.storage
    .from('generated-images')
    .getPublicUrl(filePath)

  return publicUrl
}
