import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient as createClient } from '@/lib/supabase/server'
import { getAppUrl, getPriceId, getStripe, type BillablePlan } from '@/lib/stripe'

const schema = z.object({ plan: z.enum(['starter', 'growth']) })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id, subscription_status')
    .eq('id', user.id)
    .single()

  if (profile?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(profile.subscription_status ?? '')) {
    return NextResponse.json({ error: 'Already subscribed', manageBilling: true }, { status: 409 })
  }

  const stripe = getStripe()
  const appUrl = getAppUrl(req.url)
  const plan = parsed.data.plan as BillablePlan

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: getPriceId(plan), quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?checkout=success`,
    cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
    allow_promotion_codes: true,
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan },
    subscription_data: { metadata: { user_id: user.id, plan } },
  })

  return NextResponse.json({ url: session.url })
}
