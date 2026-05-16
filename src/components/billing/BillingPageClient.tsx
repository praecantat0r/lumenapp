import { BillingActions } from './BillingActions'
import { PLAN_LIMITS, PlanLimits } from '@/lib/plans'

type Plan = 'free' | 'starter' | 'growth' | 'agency' | 'pro'

interface Profile {
  subscription_status: string | null
  current_period_end: string | null
  stripe_customer_id: string | null
}

interface Props {
  plan: Plan
  planLabel: string
  postsUsed: number
  photosUsed: number
  limits: PlanLimits
  profile: Profile | null
  autoStartPlan?: 'starter' | 'growth'
}

const COMPARISON_PLANS: { key: 'free' | 'starter' | 'growth'; label: string }[] = [
  { key: 'free',    label: 'Free'    },
  { key: 'starter', label: 'Starter' },
  { key: 'growth',  label: 'Growth'  },
]

function ProgressBar({ value, max, label, empty }: { value: number; max: number; label: string; empty?: boolean }) {
  const pct = max === -1 ? 20 : Math.min((value / max) * 100, 100)
  const danger = !empty && max !== -1 && pct > 85
  const fillColor = danger ? '#E07070' : 'var(--candle)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-syne)', fontWeight: 600, color: empty ? 'var(--muted)' : danger ? '#E07070' : 'var(--parchment)' }}>
          {empty ? 'Not included' : max === -1 ? `${value} / ∞` : `${value} / ${max}`}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 9999, background: 'rgba(78,69,56,0.3)', overflow: 'hidden' }}>
        {!empty && (
          <div style={{
            height: '100%',
            borderRadius: 9999,
            background: fillColor,
            width: `${max === -1 ? 20 : pct}%`,
            transition: 'width 0.4s ease',
          }} />
        )}
      </div>
    </div>
  )
}

function FeatureRow({ label, value }: { label: string; value: string | boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(78,69,56,0.12)' }}>
      <span style={{ fontSize: 12, color: 'var(--sand)' }}>{label}</span>
      {value === true && (
        <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      )}
      {value === false && (
        <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--muted)', fontVariationSettings: "'FILL' 0" }}>remove</span>
      )}
      {typeof value === 'string' && (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--parchment)', fontFamily: 'var(--font-syne)' }}>{value}</span>
      )}
    </div>
  )
}

export function BillingPageClient({ plan, planLabel, postsUsed, photosUsed, limits, profile, autoStartPlan }: Props) {
  const effectivePlan = plan === 'pro' ? 'starter' : plan
  const isPaid = plan !== 'free'

  const renewalText = profile?.subscription_status
    ? `${profile.subscription_status}${profile.current_period_end ? ` · renews ${new Date(profile.current_period_end).toLocaleDateString()}` : ''}`
    : null

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 600, fontFamily: 'var(--font-ibm)' }}>Account</span>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 800, color: 'var(--parchment)', marginTop: 4, marginBottom: 0 }}>Billing</h1>
      </div>

      {/* Row 1: Current Plan + Usage */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

        {/* Current Plan Card */}
        <div style={{
          flex: '1 1 280px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>credit_card</span>
              <span style={{ fontSize: 11, color: 'var(--sand)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-ibm)' }}>Current plan</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-syne)', fontSize: 38, fontWeight: 800, color: 'var(--parchment)', lineHeight: 1 }}>{planLabel}</span>
              {isPaid && (
                <span style={{
                  fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                  background: 'rgba(182,141,64,0.12)', color: 'var(--candle)',
                  borderRadius: 9999, padding: '3px 10px', fontWeight: 600,
                }}>Active</span>
              )}
            </div>
            {renewalText ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6EBF8B', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--sand)' }}>{renewalText}</span>
              </div>
            ) : !isPaid ? (
              <p style={{ fontSize: 13, color: 'var(--sand)', marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
                Upgrade to unlock more posts, photos, and features.
              </p>
            ) : null}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <BillingActions plan={plan} hasCustomer={Boolean(profile?.stripe_customer_id)} autoStartPlan={autoStartPlan} />
          </div>
        </div>

        {/* Usage Card */}
        <div style={{
          flex: '1 1 240px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--candle)', fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
            <span style={{ fontSize: 11, color: 'var(--sand)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-ibm)' }}>Usage this month</span>
          </div>

          <ProgressBar label="Posts" value={postsUsed} max={limits.postsPerMonth} />
          <ProgressBar
            label="Product photos"
            value={photosUsed}
            max={limits.productPhotosPerMonth}
            empty={limits.productPhotosPerMonth === 0}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--sand)' }}>Composite mode</span>
            {limits.composite
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--candle)', fontWeight: 600 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Enabled
                </span>
              : <span style={{ fontSize: 12, color: 'var(--muted)' }}>Growth &amp; above</span>
            }
          </div>
        </div>
      </div>

      {/* Row 2: Plan Comparison */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--sand)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-ibm)', marginBottom: 14 }}>Plans</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {COMPARISON_PLANS.map(({ key, label }) => {
            const l = PLAN_LIMITS[key]
            const isCurrent = key === effectivePlan
            return (
              <div
                key={key}
                style={{
                  background: isCurrent ? 'var(--surface-2)' : 'var(--surface)',
                  border: `1px solid ${isCurrent ? 'var(--candle)' : 'var(--border)'}`,
                  borderRadius: 16,
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-syne)', fontSize: 20, fontWeight: 700, color: 'var(--parchment)' }}>{label}</span>
                  {isCurrent && (
                    <span style={{
                      fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                      background: 'rgba(182,141,64,0.12)', color: 'var(--candle)',
                      borderRadius: 9999, padding: '3px 10px', fontWeight: 600,
                    }}>Current</span>
                  )}
                </div>
                <div>
                  <FeatureRow label="Posts / month" value={l.postsPerMonth === -1 ? 'Unlimited' : String(l.postsPerMonth)} />
                  <FeatureRow label="Product photos" value={l.productPhotosPerMonth === 0 ? false : l.productPhotosPerMonth === -1 ? 'Unlimited' : `${l.productPhotosPerMonth} / mo`} />
                  <FeatureRow label="Brand assets" value={l.assets === -1 ? 'Unlimited' : String(l.assets)} />
                  <FeatureRow label="Custom templates" value={l.templates === 0 ? false : l.templates === -1 ? 'Unlimited' : String(l.templates)} />
                  <FeatureRow label="Composite mode" value={l.composite} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
