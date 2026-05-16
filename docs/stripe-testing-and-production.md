# Stripe Testing and Production Guide for Lumen

This guide is tailored to Lumen's current billing implementation:

- first-time purchases use Stripe Checkout
- existing subscribers are sent to the Stripe customer portal
- Supabase is updated by Stripe webhooks
- the active app plan is derived from Stripe price IDs, not from subscription metadata

It is intentionally narrower than the full Stripe documentation set. It covers the parts that govern this app's integration and day-to-day operation.

## 1. How Lumen billing works

### First purchase

When a signed-in user upgrades from the free plan, Lumen creates a Stripe Checkout Session in subscription mode using either `STRIPE_STARTER_PRICE_ID` or `STRIPE_GROWTH_PRICE_ID`.

After Checkout succeeds, Stripe sends `checkout.session.completed`. Lumen retrieves the subscription and stores the billing state in `profiles`.

### Existing subscriber changes

If a user already has an active, trialing, or past-due subscription, Lumen does **not** create a new Checkout Session. It redirects the user to the Stripe customer portal instead.

That means plan changes such as Starter -> Growth depend on the customer portal being configured to allow subscription updates and to expose the relevant products/prices.

### Webhooks that mutate app state

Lumen currently updates Supabase for:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Other valid Stripe events can still return `200 OK` from the webhook endpoint while producing no database change, because the handler ignores them after signature verification.

### What determines the plan

Lumen derives the app plan from the subscription item's Stripe price ID:

- `STRIPE_STARTER_PRICE_ID` -> `starter`
- `STRIPE_GROWTH_PRICE_ID` -> `growth`

Do not rely on `subscription.metadata.plan` as the source of truth for the current plan. In this app, metadata can be stale after a customer changes plans through the portal.

## 2. Test-mode setup checklist

Stripe test environments let you exercise real integration flows without moving real money. Stripe recommends testing in a testing environment before exposing an integration to customers. [Stripe: Testing use cases](https://docs.stripe.com/test-mode)

### Required environment variables

For test mode, keep every Stripe value in the same mode:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_GROWTH_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=https://your-test-app.example
```

Mode alignment matters:

- test API key + test prices + test webhook secret
- live API key + live prices + live webhook secret

If you use the same webhook URL in test and live mode, Stripe still gives each mode a different signing secret. [Stripe: Webhook endpoint testing](https://docs.stripe.com/webhooks/test)

### Stripe Dashboard setup

In test mode:

1. Create the Starter and Growth products/prices.
2. Copy the test price IDs into `STRIPE_STARTER_PRICE_ID` and `STRIPE_GROWTH_PRICE_ID`.
3. Create a webhook endpoint for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy that endpoint's test signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Configure the customer portal:
   - allow customers to update subscriptions
   - allow plan switching
   - include the Starter and Growth products/prices customers may switch between

Stripe's portal supports upgrading and downgrading subscriptions, but you must configure what customers are allowed to do. [Stripe: Customer portal](https://docs.stripe.com/billing/subscriptions/integrating-customer-portal)

### Recommended testing assets

Use:

- Stripe test cards for payment scenarios
- Billing simulations / test clocks for time-based subscription behavior such as renewals and lifecycle events

Stripe recommends test resources for Billing integrations, including test cards and test clocks for simulating subscription behavior over time. [Stripe: Billing testing](https://docs.stripe.com/billing/testing) [Stripe: Test clocks](https://docs.stripe.com/billing/testing/test-clocks)

## 3. Local testing workflow

### When to use the Stripe CLI

Use the Stripe CLI when testing your local app on `localhost`.

Example:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
```

The CLI prints a temporary signing secret. When forwarding locally, use that CLI secret as `STRIPE_WEBHOOK_SECRET`; do **not** use the Dashboard endpoint secret for that local forwarded session.

Stripe documents local event forwarding and signature verification as the standard local webhook testing flow. [Stripe: Webhook endpoint testing](https://docs.stripe.com/webhooks/test)

### When to use Dashboard test mode instead

Use Dashboard test mode when testing a deployed staging or production-like URL such as:

```text
https://app.example.com/api/billing/webhook
```

In that case:

- use the Dashboard webhook endpoint
- use the Dashboard endpoint's **test-mode** signing secret
- inspect deliveries in the Dashboard / Workbench for the actual endpoint

### Local smoke test

1. Start Lumen locally.
2. Start `stripe listen --forward-to localhost:3000/api/billing/webhook`.
3. Put the CLI-provided `whsec_...` into local `.env`.
4. Create a test Checkout Session from the app.
5. Complete payment using a Stripe test card.
6. Confirm:
   - Checkout redirects back successfully
   - Stripe emits `checkout.session.completed`
   - webhook delivery succeeds
   - `profiles.plan` becomes `starter` or `growth`
   - Stripe customer/subscription IDs are written to the same row

## 4. End-to-end test matrix

Run this matrix before calling the integration healthy.

| Scenario | Action | Stripe signal to inspect | Expected Supabase result |
| --- | --- | --- | --- |
| First subscription | Free user buys Starter in Checkout | `checkout.session.completed`, then subscription events | `plan=starter`, starter price ID stored, customer/subscription IDs present |
| Upgrade | Starter user switches to Growth in the customer portal | `customer.subscription.updated` | `plan=growth`, growth price ID stored |
| Cancel at period end | Customer cancels in portal | `customer.subscription.updated` | cancellation state reflected from the latest Stripe subscription payload |
| Delete / terminate | Subscription actually ends | `customer.subscription.deleted` | plan becomes `free` because inactive subscriptions map to free |
| Failed payment | Simulate a failed renewal/payment flow | related Billing events plus resulting subscription state | app state follows subscription status stored from Stripe |
| Renewal | Advance time with a Billing simulation / test clock | renewal-related Billing events | period end moves forward and app remains on the paid plan if active |

Stripe recommends testing Billing lifecycle behavior, including payment failures and time-based subscription behavior, before production. [Stripe: Billing testing](https://docs.stripe.com/billing/testing) [Stripe: Test clocks](https://docs.stripe.com/billing/testing/test-clocks)

### Minimal DB checks after every test

Inspect the user's `profiles` row and verify:

- `plan`
- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`
- `subscription_status`
- `current_period_end`
- `cancel_at`
- `canceled_at`

## 5. Webhook verification and troubleshooting

### The rule that saves the most time

An event existing in Stripe is **not** the same thing as your endpoint processing it.

Always inspect:

1. the event type
2. the specific webhook endpoint delivery attempt
3. the HTTP response from your app
4. the resulting database row

Stripe exposes endpoint deliveries separately from events and supports automatic retries plus manual resends for webhook events. [Stripe: Webhook endpoint testing](https://docs.stripe.com/webhooks/test)

### Common failure patterns

#### Wrong signing secret

Symptoms:

- endpoint receives the event
- delivery fails with a `400`
- response mentions signature verification or invalid signature

Likely cause:

- using a live secret with test events
- using a Dashboard secret while testing a local CLI-forwarded webhook

Fix:

- test Dashboard endpoint -> test Dashboard secret
- live Dashboard endpoint -> live Dashboard secret
- local CLI forwarding -> CLI-provided secret

Stripe explicitly notes that if you use the same endpoint URL for test and live keys, the signing secret is still different for each mode. [Stripe: Webhook endpoint testing](https://docs.stripe.com/webhooks/test)

#### Wrong event inspected

Symptoms:

- you see a successful Stripe event such as `invoice_payment.paid`
- your webhook delivery says `200 OK`
- Supabase does not change

Likely cause:

- you inspected an event that Lumen accepts but intentionally ignores

Fix:

- for plan changes, inspect `customer.subscription.updated`
- for first purchase, inspect `checkout.session.completed`

#### Delivery missing

Symptoms:

- event exists in Stripe
- no delivery attempt exists for your endpoint

Likely cause:

- endpoint is not subscribed to that event type
- you are looking at the wrong webhook endpoint or wrong mode

Fix:

- confirm the endpoint is enabled for:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- confirm you are viewing the correct test/live endpoint

#### `200 OK` but the database did not change

This is the failure mode that recently appeared during a Starter -> Growth test.

Use this sequence:

1. Open the actual `customer.subscription.updated` event, not a neighboring invoice or payment event.
2. Confirm that the event payload contains the new Growth price ID.
3. Confirm that the webhook delivery for **that exact event** reached the Lumen endpoint.
4. Confirm the response is `200 OK`.
5. Check the deployed code version:
   - if the event reached the app and DB state still did not change, the deployed handler may differ from local code
   - or the handler may have updated zero rows because the event could not resolve the intended user
6. Check the row identified by `subscription.metadata.user_id`, then compare:
   - `stripe_price_id`
   - `plan`
   - `subscription_status`

In Lumen, this matters because a valid but ignored event also returns `200`, and because the app uses price IDs rather than metadata to derive the plan.

#### Cancellation appears not to work

Stripe can keep a subscription `active` while scheduling it to end later by setting `cancel_at`. During that window, Lumen should keep paid access active but display the scheduled cancellation date. Do not expect the plan to become `free` until Stripe sends the terminal subscription end/deletion state. [Stripe: Cancel subscriptions](https://docs.stripe.com/billing/subscriptions/cancel)

### Retry behavior

Stripe automatically retries failed webhook deliveries in live mode for up to three days with exponential backoff, and also supports manual resends from the Dashboard or CLI. [Stripe: Webhook endpoint testing](https://docs.stripe.com/webhooks/test)

## 6. Production cutover checklist

Stripe says moving from test to live is mostly about swapping keys, but you still need to review the rest of the integration before launch. [Stripe: Go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)

### Before switching

- complete the full end-to-end test matrix in test mode
- confirm the portal supports the exact live subscription actions you want customers to take
- confirm the production webhook URL is HTTPS
- confirm the app can tolerate webhook retry behavior and duplicate delivery
- decide who monitors Stripe failures after launch

Stripe requires HTTPS webhook endpoints in live mode and recommends signature verification for received events. [Stripe: Webhook endpoint testing](https://docs.stripe.com/webhooks/test)

### Replace every test-mode value

Create the live equivalents and replace:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_endpoint_secret
STRIPE_STARTER_PRICE_ID=live_price_id
STRIPE_GROWTH_PRICE_ID=live_price_id
```

Also ensure any client-side publishable key in the app is switched from `pk_test_...` to `pk_live_...` if one is introduced later.

Stripe's live-mode migration guidance calls out replacing API keys and updating webhook signing secrets for live endpoints. [Stripe: API keys](https://docs.stripe.com/keys)

### Recreate the live Dashboard configuration

In live mode:

1. create the live products and prices
2. create the live webhook endpoint
3. subscribe it to the same four events
4. copy the live endpoint signing secret into production env
5. configure the customer portal in live mode
6. verify the portal allows the intended subscription-management actions

Stripe documents that portal configuration must also be set up in live mode. [Stripe: Customer portal integration](https://docs.stripe.com/customer-management/integrate-customer-portal)

### Final production smoke test

After deploying live configuration:

1. use a real internal purchase with a low-risk account if your business process allows it
2. confirm Checkout succeeds
3. confirm the live webhook delivery reaches the live endpoint
4. confirm the correct live Supabase row updates
5. confirm the customer portal opens and reflects the live subscription

### Rollback posture

Before launch, know how you will:

- disable or hide upgrade entry points if billing breaks
- restore the previous known-good env configuration
- inspect failed deliveries
- manually resend events after a fix

Stripe supports manual webhook resends for previously delivered events, which is useful after correcting an endpoint problem. [Stripe: Webhook endpoint testing](https://docs.stripe.com/webhooks/test)

## 7. Post-launch maintenance

### Monitor continuously

Watch:

- webhook delivery failures
- unusual subscription churn or failed-payment spikes
- mismatches between Stripe subscriptions and Supabase `profiles`

### Rotate secrets

Stripe recommends rolling webhook signing secrets periodically or after suspected compromise. When rolling a secret, Stripe can keep multiple secrets active during a transition window so you can update your server safely. [Stripe: Webhook endpoint testing](https://docs.stripe.com/webhooks/test)

### Keep a regression ritual

After any billing-related change, rerun at least:

- new subscription
- Starter -> Growth upgrade
- cancellation flow
- webhook delivery inspection
- DB verification

## 8. Quick audit checklist

Use this before each release that touches billing.

- [ ] API key mode matches price IDs and webhook secret mode
- [ ] Correct webhook endpoint is enabled
- [ ] Endpoint listens for the four events Lumen uses
- [ ] Customer portal allows the intended subscription changes
- [ ] First purchase test passed
- [ ] Starter -> Growth portal upgrade test passed
- [ ] `customer.subscription.updated` delivery inspected directly
- [ ] Supabase row changed as expected
- [ ] Wrong-event and wrong-secret failure modes are understood
- [ ] Live rollout values are ready and separate from test values
- [ ] Someone knows where to inspect failures after launch

## Official Stripe references

- [Testing use cases](https://docs.stripe.com/test-mode)
- [Test your Billing integration](https://docs.stripe.com/billing/testing)
- [Use Simulations / test clocks](https://docs.stripe.com/billing/testing/test-clocks)
- [Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks/test)
- [Customer self-service with a customer portal](https://docs.stripe.com/billing/subscriptions/integrating-customer-portal)
- [Integrate the customer portal with the API](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [Modify subscriptions](https://docs.stripe.com/billing/subscriptions/change)
- [Go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)
- [API keys](https://docs.stripe.com/keys)
