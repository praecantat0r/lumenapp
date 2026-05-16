import Stripe from 'stripe'

export type BillablePlan = 'starter' | 'growth'
export type AppPlan = 'free' | BillablePlan | 'agency' | 'pro'

let stripeClient: Stripe | null = null

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY)
  return stripeClient
}

export function getPriceId(plan: BillablePlan) {
  const priceId = plan === 'starter'
    ? process.env.STRIPE_STARTER_PRICE_ID
    : process.env.STRIPE_GROWTH_PRICE_ID

  if (!priceId) throw new Error(`Stripe price is not configured for ${plan}`)
  return priceId
}

export function planFromPriceId(priceId?: string | null): AppPlan {
  if (priceId && priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter'
  if (priceId && priceId === process.env.STRIPE_GROWTH_PRICE_ID) return 'growth'
  return 'free'
}

export function planFromSubscription(subscription: Stripe.Subscription): AppPlan {
  if (!['active', 'trialing', 'past_due'].includes(subscription.status)) return 'free'
  return planFromPriceId(subscription.items.data[0]?.price.id)
}

export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnd = subscription.items.data[0]?.current_period_end
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null
}

export function getSubscriptionCancelAt(subscription: Stripe.Subscription) {
  return subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null
}

export function getSubscriptionCanceledAt(subscription: Stripe.Subscription) {
  return subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
}

export function getAppUrl(requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin
  if (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1')) {
    return requestOrigin
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? requestOrigin
}
