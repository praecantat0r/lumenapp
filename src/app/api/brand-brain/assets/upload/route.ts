import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createRouteClient as createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type AssetCategory = 'product_photo' | 'place_photo' | 'label' | 'logo' | 'photo' | 'other'

async function classifyAsset(bytes: Uint8Array, mimeType: string): Promise<AssetCategory> {
  try {
    const client = new Anthropic()
    const base64 = Buffer.from(bytes).toString('base64')
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: base64 },
          },
          {
            type: 'text',
            text: `Classify this brand asset into exactly one category. Reply with ONLY the category name, nothing else.

product_photo — a real photograph of a physical product held or placed alone (bottle, jar, bag, box, food item, equipment close-up, etc.)
place_photo — a photograph of a physical location, interior, or environment (gym interior, store, cafe, restaurant, outdoor space, building, studio, etc.)
label — a flat graphic/artwork designed to be applied to a product (label design, sticker template, packaging artwork)
logo — a brand logo, wordmark, or icon (clean graphic, usually on transparent/white background)
photo — any other lifestyle or general photograph
other — anything else

Reply with one of: product_photo, place_photo, label, logo, photo, other`,
          },
        ],
      }],
    })
    const text = (msg.content[0] as { type: string; text: string }).text.trim().toLowerCase()
    if (['product_photo', 'place_photo', 'label', 'logo', 'photo', 'other'].includes(text)) {
      return text as AssetCategory
    }
    return 'photo'
  } catch {
    return 'photo'
  }
}

export async function POST(req: NextRequest) {
  // Auth check via session cookie
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const service = getServiceClient()

  // Create bucket if needed (no-op if exists), then ensure it's public
  await service.storage.createBucket('brand-assets', { public: true })
  await service.storage.updateBucket('brand-assets', { public: true })

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  // Upload and classify in parallel
  const [uploadResult, category] = await Promise.all([
    service.storage.from('brand-assets').upload(path, bytes, { contentType: file.type, upsert: true }),
    classifyAsset(bytes, file.type as 'image/jpeg' | 'image/png' | 'image/webp'),
  ])

  if (uploadResult.error) return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from('brand-assets').getPublicUrl(path)

  return NextResponse.json({ storage_path: path, public_url: publicUrl, asset_category: category })
}
