# Inbux

Inbux is a deliverability-first email marketing platform built with Next.js, Supabase and Resend.

## Current architecture

- Next.js App Router dashboard
- Supabase Auth + Row Level Security
- Contacts + suppression management
- Campaign builder and preflight checks
- Resend-backed campaign dispatch through Supabase Edge Functions
- Batch sending with idempotency keys
- Sending-domain setup and DNS records
- Resend webhook ingestion for sent, delivered, bounced, complained, opened and clicked events
- Public unsubscribe endpoint
- Live campaign engagement counters
- GitHub Actions lint/build CI

## Required production secrets

Set these in Supabase Edge Function secrets:

- `RESEND_API_KEY` — a Resend API key with sending access
- `RESEND_WEBHOOK_SECRET` — the signing secret for the Resend webhook pointing to:
  `https://liijxwiambsqapgbbfre.supabase.co/functions/v1/webhook-resend`

The app uses the Supabase project's managed secret key internally for webhook/unsubscribe database writes.

## Resend setup

1. Connect your Resend account.
2. Create/verify the sending domain from **Inbux → Inbox Health → Configure domain**.
3. Register the webhook URL above for the email events:
   - email.sent
   - email.delivered
   - email.delivery_delayed
   - email.bounced
   - email.complained
   - email.opened
   - email.clicked
4. Store the webhook signing secret as `RESEND_WEBHOOK_SECRET`.
5. Store the Resend API key as `RESEND_API_KEY`.

## Deployment

Connect the `thedanielmalik/inbux` GitHub repository to Vercel and add:

- `NEXT_PUBLIC_SUPABASE_URL=https://liijxwiambsqapgbbfre.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>`

Then configure Supabase Auth's Site URL and redirect URL for the production Vercel domain.

The Edge Functions are already deployed in Supabase:
- `send-campaign`
- `domain-manager`
- `webhook-resend`
- `unsubscribe`

## Safety

Never expose `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, or a Supabase secret key in browser code or `NEXT_PUBLIC_` variables.


<!-- Vercel deployment trigger: 2026-10-02 -->
