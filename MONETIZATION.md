# Monetization and “Pro” tier (discovery)

This document sketches how FPL DnD could add a paid tier aligned with common FPL tooling (effective ownership, exports, live rank polish) without implying Premier League affiliation.

## Suggested Pro feature set

| Area | Freemium baseline | Pro |
|------|-------------------|-----|
| **Core app** | Squad, transfers, dashboard, FPL proxy, basic insights | Same, with higher rate limits if you add server-side quotas |
| **AI / heuristics** | Captain/transfers guidance with clear “heuristic” disclaimers | Deeper sections: batch comparisons, saved scenarios, PDF/CSV export of recommendations |
| **Analytics** | History export (CSV) as today | Scheduled exports, season archives |
| **Template / EO** | — | Effective ownership & template-risk views from public picks + bootstrap |
| **Leagues** | Mini-league live polling (existing API) | Faster refresh tier, pinned leagues, optional notifications (email requires compliance) |

## Stripe integration sketch

1. **Product**: Create a Product and recurring Price (monthly/seasonal) in the [Stripe Dashboard](https://dashboard.stripe.com/).
2. **Checkout**: Server route `POST /api/billing/checkout` creates a [Checkout Session](https://stripe.com/docs/api/checkout/sessions) with `mode: subscription`, `success_url` / `cancel_url`, and `client_reference_id` or `metadata` tying the Stripe customer to your app’s session `entryId` or a future user id.
3. **Webhook**: `POST /api/billing/webhook` verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`, handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and stores `stripeCustomerId`, `subscriptionStatus`, and `proExpiresAt` in your session store or DB.
4. **Entitlements**: Middleware or server helpers check `subscriptionStatus === 'active'` (or valid `proExpiresAt`) before serving Pro API routes or page sections.
5. **Secrets**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and price id env vars stay **server-only** (no `NEXT_PUBLIC_`).

## Legal / trust

- State clearly that the app is **not affiliated** with the Premier League or Fantasy Premier League.
- If you take payments or emails in the EU, align with GDPR (privacy policy, retention, subprocessors including Stripe and hosting).
- Avoid bookmaker odds or affiliate links unless you understand local licensing and advertising rules.

This is a product/architecture outline only; implementation is not included in the open-source baseline unless you choose to build it.
