'use client'

import { useEffect, useRef, useState } from 'react'

type Plan = 'free' | 'starter' | 'growth' | 'agency' | 'pro'

const primaryStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 18px', background: 'var(--candle)',
  color: '#fff', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-syne)',
  letterSpacing: '0.04em', cursor: 'pointer', transition: 'background 0.15s',
}

const ghostStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 18px', background: 'transparent',
  color: 'var(--sand)', border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-ibm)',
  cursor: 'pointer', transition: 'all 0.15s',
}

export function BillingActions({ plan, hasCustomer, autoStartPlan }: { plan: Plan; hasCustomer: boolean; autoStartPlan?: 'starter' | 'growth' }) {
  const [loading, setLoading] = useState<string | null>(null)
  const started = useRef(false)

  async function openCheckout(targetPlan: 'starter' | 'growth') {
    setLoading(targetPlan)
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: targetPlan }),
    })
    const data = await res.json()
    if (data.manageBilling) return openPortal()
    if (data.url) window.location.href = data.url
    setLoading(null)
  }

  async function openPortal() {
    setLoading('portal')
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setLoading(null)
  }

  useEffect(() => {
    if (plan === 'free' && autoStartPlan && !started.current) {
      started.current = true
      void openCheckout(autoStartPlan)
    }
  }, [autoStartPlan, plan])

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {plan === 'free' && (
        <>
          <button
            style={primaryStyle}
            disabled={loading === 'starter'}
            onClick={() => openCheckout('starter')}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ember)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--candle)')}
          >{loading === 'starter' ? 'Loading…' : 'Upgrade to Starter'}</button>
          <button
            style={ghostStyle}
            disabled={loading === 'growth'}
            onClick={() => openCheckout('growth')}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,0.4)'; e.currentTarget.style.color = 'var(--parchment)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
          >{loading === 'growth' ? 'Loading…' : 'Upgrade to Growth'}</button>
        </>
      )}
      {plan === 'starter' && (
        <button
          style={primaryStyle}
          disabled={loading === 'growth'}
          onClick={() => openCheckout('growth')}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--ember)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--candle)')}
        >{loading === 'growth' ? 'Loading…' : 'Upgrade to Growth'}</button>
      )}
      {hasCustomer && (
        <button
          style={ghostStyle}
          disabled={loading === 'portal'}
          onClick={openPortal}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,0.4)'; e.currentTarget.style.color = 'var(--parchment)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
        >{loading === 'portal' ? 'Loading…' : 'Manage billing'}</button>
      )}
    </div>
  )
}
