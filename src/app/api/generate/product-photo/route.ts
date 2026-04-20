import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeLocationPhoto, analyzeProductAsset, generateProductPhotoPrompt, type AssetGuidance } from '@/lib/anthropic'
import { generateImage, prefetchReferenceImages } from '@/lib/nanobanana'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: bb } = await supabase
    .from('brand_brains')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (!bb) return NextResponse.json({ error: 'Brand Brain not found' }, { status: 404 })

  // Parse request body
  const body = await req.json().catch(() => ({}))
  const assetMode: 'asset' | 'composite' = body.assetMode === 'composite' ? 'composite' : 'asset'
  const settings = body.settings ?? {}

  const assetUrl: string | undefined          = body.assetUrl
  const assetName: string | undefined         = body.assetName
  const assetDescription: string | undefined  = body.assetDescription
  const scenicAssetUrl: string | undefined    = body.scenicAssetUrl
  const scenicAssetName: string | undefined   = body.scenicAssetName
  const scenicAssetDescription: string | undefined = body.scenicAssetDescription
  const productAssetUrl: string | undefined   = body.productAssetUrl
  const productAssetName: string | undefined  = body.productAssetName
  const productAssetDescription: string | undefined = body.productAssetDescription

  // Create initial record
  const { data: photo, error: insertErr } = await supabase
    .from('product_photos')
    .insert({
      user_id: user.id,
      status: 'generating',
      settings,
      asset_mode: assetMode,
      asset_url: assetUrl,
      asset_name: assetName,
      asset_description: assetDescription,
      scenic_asset_url: scenicAssetUrl,
      scenic_asset_name: scenicAssetName,
      scenic_asset_description: scenicAssetDescription,
      product_asset_url: productAssetUrl,
      product_asset_name: productAssetName,
      product_asset_description: productAssetDescription,
    })
    .select('id')
    .single()

  if (insertErr || !photo) {
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
  }

  // Run generation async — return photo_id immediately for polling
  ;(async () => {
    try {
      // Analyze assets in parallel — vision analysis runs alongside each other
      const [locationDescription, productPhysicalDescription, productPhysicalDescriptionComposite] =
        await Promise.all([
          assetMode === 'composite' && scenicAssetUrl
            ? analyzeLocationPhoto(scenicAssetUrl).catch(() => undefined)
            : Promise.resolve(undefined),
          assetMode === 'asset' && assetUrl
            ? analyzeProductAsset(assetUrl).catch(() => undefined)
            : Promise.resolve(undefined),
          assetMode === 'composite' && productAssetUrl
            ? analyzeProductAsset(productAssetUrl).catch(() => undefined)
            : Promise.resolve(undefined),
        ])

      // Build AssetGuidance
      const assetGuidance: AssetGuidance = assetMode === 'composite'
        ? {
            url: scenicAssetUrl ?? '',
            name: scenicAssetName,
            description: scenicAssetDescription,
            type: 'place_photo',
            mode: 'composite',
            locationDescription,
            productUrl: productAssetUrl,
            productName: productAssetName,
            productDescription: productAssetDescription,
            productPhysicalDescriptionComposite,
          }
        : {
            url: assetUrl ?? '',
            name: assetName,
            description: assetDescription,
            productPhysicalDescription,
            type: 'product_photo',
            mode: 'specific',
          }

      // Build reference URLs first — needed for both prefetch and generateImage
      const backgroundPhotoUrl: string | undefined =
        settings.backgroundType === 'photo' ? settings.backgroundPhotoUrl : undefined

      const referenceUrls: string[] = assetMode === 'composite'
        ? [scenicAssetUrl, productAssetUrl, backgroundPhotoUrl].filter(Boolean) as string[]
        : [assetUrl, backgroundPhotoUrl].filter(Boolean) as string[]

      // Run Claude prompt generation and reference image fetching in parallel.
      const [{ image_prompt }, prefetchedImages] = await Promise.all([
        generateProductPhotoPrompt(bb, { assetGuidance, settings }),
        prefetchReferenceImages(referenceUrls),
      ])

      // Generate image — pass pre-fetched images so generateImage skips the fetch step
      const image_url = await generateImage(image_prompt, [], prefetchedImages)

      await supabase
        .from('product_photos')
        .update({ status: 'done', image_url, image_prompt })
        .eq('id', photo.id)
    } catch (err) {
      console.error('[product-photo] generation error:', err)
      await supabase
        .from('product_photos')
        .update({ status: 'failed' })
        .eq('id', photo.id)
    }
  })()

  return NextResponse.json({ photo_id: photo.id })
}
