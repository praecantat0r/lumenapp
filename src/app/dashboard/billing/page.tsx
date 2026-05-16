import { createClient, getUser } from '@/lib/supabase/server'
import { BillingActions } from '@/components/billing/BillingActions'
import { Card } from '@/components/ui'
import { getLimits, monthStart } from '@/lib/plans'

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()
  const [{ data: profile }, { count: postsUsed }, { count: photosUsed }] = await Promise.all([
    supabase.from('profiles').select('plan, stripe_customer_id, subscription_status, current_period_end').eq('id', user.id).single(),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', monthStart()),
    supabase.from('product_photos').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', monthStart()),
  ])

  const plan = (profile?.plan ?? 'free') as 'free' | 'starter' | 'growth' | 'agency' | 'pro'
  const { checkout } = await searchParams
  const limits = getLimits(plan)
  const planLabel = plan === 'pro' ? 'Starter' : plan[0].toUpperCase() + plan.slice(1)

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 600 }}>Account</span>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, color: 'var(--parchment)', marginTop: 4 }}>Billing</h1>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Current plan</div>
            <div style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 700, color: 'var(--parchment)' }}>{planLabel}</div>
            {profile?.subscription_status && (
              <div style={{ fontSize: 13, color: 'var(--sand)', marginTop: 6 }}>
                Status: {profile.subscription_status}
                {profile.current_period_end ? ` · renews ${new Date(profile.current_period_end).toLocaleDateString()}` : ''}
              </div>
            )}
          </div>
          <BillingActions
            plan={plan}
            hasCustomer={Boolean(profile?.stripe_customer_id)}
            autoStartPlan={checkout === 'starter' || checkout === 'growth' ? checkout : undefined}
          />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <Card>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Posts this month</div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 700, marginTop: 8 }}>
            {postsUsed ?? 0} / {limits.postsPerMonth === -1 ? '∞' : limits.postsPerMonth}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Product photos this month</div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 700, marginTop: 8 }}>
            {photosUsed ?? 0} / {limits.productPhotosPerMonth === -1 ? '∞' : limits.productPhotosPerMonth}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Composite mode</div>
          <div style={{ fontFamily: 'var(--font-syne)', fontSize: 28, fontWeight: 700, marginTop: 8 }}>
            {limits.composite ? 'Included' : 'Growth only'}
          </div>
        </Card>
      </div>
    </div>
  )
}
