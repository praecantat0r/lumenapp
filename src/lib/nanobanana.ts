import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase/service'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Primary model first; preview model as fallback if primary is unavailable.
const MODEL_SEQUENCE = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
]

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callGemini(
  apiKey: string,
  model: string,
  parts: unknown[]
): Promise<{ ok: boolean; status: number; data: unknown }> {
    const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000) // 90s per attempt
  try {
    const res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          // Both TEXT and IMAGE are required — sole "IMAGE" is rejected by
          // several model variants.
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: '4:5',
            imageSize: '1K',
          },
        },
      }),
      signal: controller.signal,
    })
    const data = await res.json()
    return { ok: res.ok, status: res.status, data }
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return { ok: false, status: isAbort ? 408 : 500, data: { error: isAbort ? 'Request timeout' : String(err) } }
  } finally {
    clearTimeout(timeout)
  }
}

export type ImagePart = { inline_data: { mime_type: string; data: string } }

// Fetch, resize, and encode reference images in parallel.
// Exported so callers can prefetch images concurrently with prompt generation.
export async function prefetchReferenceImages(urls: string[]): Promise<ImagePart[]> {
  const results = await Promise.all(
    urls.slice(0, 14).map(async (url): Promise<ImagePart | null> => {
      try {
        const res = await fetch(url)
        const buffer = Buffer.from(await res.arrayBuffer())
        const originalMime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
        // Resize to max 800px — reduces egress and speeds up API calls.
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

export async function generateImage(
  prompt: string,
  referenceImageUrls: string[] = [],
  prefetchedImages?: ImagePart[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables')

  // Use pre-fetched images if provided (allows parallel prefetch + prompt generation),
  // otherwise fetch now.
  const imageParts = prefetchedImages ?? await prefetchReferenceImages(referenceImageUrls)

  const parts = [{ text: prompt }, ...imageParts]

  let lastError = ''

  for (const model of MODEL_SEQUENCE) {
    // Up to 2 retries per model for transient 503s.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await sleep(attempt * 2000)

      const { ok, status, data } = await callGemini(apiKey, model, parts)

      if (status === 503 || status === 429) {
        // 503 = service unavailable (model access / overload), 429 = rate limit.
        // Retry on same model once, then fall through to next model.
        lastError = `${model} returned ${status}: ${JSON.stringify(data)}`
        if (attempt < 2) continue
        break // try next model
      }

      if (!ok) {
        // Any other error (400, 401, 404…) won't improve with retries — skip to next model.
        lastError = `${model} error ${status}: ${JSON.stringify(data)}`
        break
      }

      // Success — extract the image part.
      const responseParts: { inlineData?: { mimeType: string; data: string }; text?: string }[] =
        (data as any).candidates?.[0]?.content?.parts ?? []

      const imgPart = responseParts.find((p) => p.inlineData?.data)
      if (!imgPart?.inlineData) {
        lastError = `${model} returned no image data`
        break
      }

      const imageBuffer = Buffer.from(imgPart.inlineData.data, 'base64')
      const mimeType = imgPart.inlineData.mimeType || 'image/png'
      const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png'

      // Upload to Supabase generated-images bucket and return the public URL.
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
  }

  throw new Error(`Gemini image generation failed after all models. Last error: ${lastError}`)
}
