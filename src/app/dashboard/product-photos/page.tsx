import { createClient } from '@/lib/supabase/server'
import { ProductPhotosClient } from '@/components/dashboard/ProductPhotosClient'
import type { ProductPhoto, BrandAsset } from '@/types'

export default async function ProductPhotosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: photos }, { data: assets }] = await Promise.all([
    supabase.from('product_photos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('brand_assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return (
    <ProductPhotosClient
      photos={(photos || []) as ProductPhoto[]}
      brandAssets={(assets || []) as BrandAsset[]}
    />
  )
}
