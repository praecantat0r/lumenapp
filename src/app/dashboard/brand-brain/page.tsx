import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrandBrainClient } from '@/components/brand-brain/BrandBrainClient'

export default async function BrandBrainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bb } = await supabase
    .from('brand_brains')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const { data: assets } = await supabase
    .from('brand_assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: igConn } = await supabase
    .from('instagram_connections')
    .select('username')
    .eq('user_id', user.id)
    .single()

  return <BrandBrainClient brandBrain={bb} assets={assets || []} igConnection={igConn} userId={user.id} />
}
