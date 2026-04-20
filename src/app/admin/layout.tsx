import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: bb }, { data: profile }] = await Promise.all([
    supabase.from('brand_brains').select('brand_name').eq('user_id', user.id).single(),
    supabase.from('profiles').select('email, full_name, plan').eq('id', user.id).single(),
  ])

  const [{ count: pendingCount }, { count: igCount }] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending_review'),
    supabase.from('instagram_connections').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  return (
    <DashboardShell
      userEmail={profile?.email || user.email || ''}
      userName={profile?.full_name || ''}
      brandName={bb?.brand_name || ''}
      plan={(profile?.plan as string) || 'free'}
      pendingCount={pendingCount || 0}
      instagramConnected={(igCount || 0) > 0}
      initialCollapsed={false}
    >
      {children}
    </DashboardShell>
  )
}
