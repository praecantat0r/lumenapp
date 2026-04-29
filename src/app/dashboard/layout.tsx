import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient, getUser } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const [{ data: bb }, { data: profile }, { count: pendingCount }, { count: igCount }] = await Promise.all([
    supabase.from('brand_brains').select('onboarding_complete, brand_name').eq('user_id', user.id).single(),
    supabase.from('profiles').select('email, full_name, plan').eq('id', user.id).single(),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending_review'),
    supabase.from('instagram_connections').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  if (!bb?.onboarding_complete) redirect('/onboarding')

  const cookieStore = await cookies()
  const initialCollapsed = cookieStore.get('sidebar-collapsed')?.value === 'true'

  return (
    <DashboardShell
      userEmail={profile?.email || user.email || ''}
      userName={profile?.full_name || ''}
      brandName={bb.brand_name}
      plan={(profile?.plan as string) || 'free'}
      pendingCount={pendingCount || 0}
      instagramConnected={(igCount || 0) > 0}
      initialCollapsed={initialCollapsed}
    >
      {children}
    </DashboardShell>
  )
}
