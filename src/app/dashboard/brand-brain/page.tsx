import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'

const BrandBrainClient = dynamic(
  () => import('@/components/brand-brain/BrandBrainClient').then(m => ({ default: m.BrandBrainClient })),
)

export default async function BrandBrainPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const [{ data: bb }, { data: assets }, { data: igConn }] = await Promise.all([
    supabase.from('brand_brains').select('*').eq('user_id', user.id).single(),
    supabase.from('brand_assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('instagram_connections').select('username').eq('user_id', user.id).single(),
  ])

  return <BrandBrainClient brandBrain={bb} assets={assets || []} igConnection={igConn} userId={user.id} />
}
