'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'

type Plan = 'free' | 'starter' | 'growth' | 'agency' | 'pro'

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
          <Button onClick={() => openCheckout('starter')} loading={loading === 'starter'}>Upgrade to Starter</Button>
          <Button variant="ghost" onClick={() => openCheckout('growth')} loading={loading === 'growth'}>Upgrade to Growth</Button>
        </>
      )}
      {plan === 'starter' && (
        <Button onClick={() => openCheckout('growth')} loading={loading === 'growth'}>Upgrade to Growth</Button>
      )}
      {hasCustomer && (
        <Button variant="ghost" onClick={openPortal} loading={loading === 'portal'}>Manage billing</Button>
      )}
    </div>
  )
}
