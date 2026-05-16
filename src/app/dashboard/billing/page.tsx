import { createClient, getUser } from '@/lib/supabase/server'
import { BillingPageClient } from '@/components/billing/BillingPageClient'
import { getLimits, monthStart } from '@/lib/plans'

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()
  const [{ data: profile }, { count: postsUsed }, { count: photosUsed }] = await Promise.all([
    supabase.from('profiles').select('plan, stripe_customer_id, subscription_status, current_period_end, cancel_at, canceled_at').eq('id', user.id).single(),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', monthStart()),
    supabase.from('product_photos').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', monthStart()),
  ])

  const plan = (profile?.plan ?? 'free') as 'free' | 'starter' | 'growth' | 'agency' | 'pro'
  const { checkout } = await searchParams
  const limits = getLimits(plan)
  const planLabel = plan === 'pro' ? 'Starter' : plan[0].toUpperCase() + plan.slice(1)

  return (
    <BillingPageClient
      plan={plan}
      planLabel={planLabel}
      postsUsed={postsUsed ?? 0}
      photosUsed={photosUsed ?? 0}
      limits={limits}
      profile={profile ?? null}
      autoStartPlan={checkout === 'starter' || checkout === 'growth' ? checkout : undefined}
    />
  )
}
