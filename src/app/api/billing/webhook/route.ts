import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  getStripe,
  getSubscriptionCanceledAt,
  getSubscriptionCancelAt,
  getSubscriptionPeriodEnd,
  planFromSubscription,
} from '@/lib/stripe'

async function syncSubscription(subscription: Stripe.Subscription, fallbackUserId?: string | null) {
  const supabase = createServiceClient()
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const subscriptionId = subscription.id
  const priceId = subscription.items.data[0]?.price.id ?? null
  const plan = planFromSubscription(subscription)
  const currentPeriodEnd = getSubscriptionPeriodEnd(subscription)
  const cancelAt = getSubscriptionCancelAt(subscription)
  const canceledAt = getSubscriptionCanceledAt(subscription)

  let userId = subscription.metadata.user_id || fallbackUserId || null

  if (!userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    userId = profile?.id ?? null
  }

  if (!userId) return

  const { error } = await supabase
    .from('profiles')
    .update({
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      subscription_status: subscription.status,
      current_period_end: currentPeriodEnd,
      cancel_at: cancelAt,
      canceled_at: canceledAt,
    })
    .eq('id', userId)

  if (error) throw error
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      if (subscriptionId) {
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
        await syncSubscription(subscription, session.client_reference_id)
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object as Stripe.Subscription)
      break
  }

  return NextResponse.json({ received: true })
}
