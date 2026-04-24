# Checklist — what's live, what's pending

## Live in production

- [x] `/api/scrape-seller` — single brand qualification, pure TS, OpenAI gate
- [x] `/api/enrich-contact` — Better Contact submit + poll (45s) with auto-fallback on credits exhaustion
- [x] `/api/enrich-contact/status` — async status poll for tasks that outlive the 60s Vercel cap
- [x] `/api/emails/generate` — GPT-4o personalized email, custom-prompt override, signature sanitizer
- [x] `/api/emails/send` — nodemailer SMTP (Google Workspace)
- [x] `/api/sellers` — list + filters + marketplace profiles
- [x] `/api/seller/[id]` — single seller detail
- [x] `/api/research` — brand-to-marketplace ranking
- [x] `/api/competitors` — GPT-4o competitor intel
- [x] Workspace UI: Prospection (bulk + specific), Outreach (seller accounts + detail), Pipeline (Kanban)
- [x] Zustand store with localStorage persistence
- [x] 6-criteria continuous scoring (category 28, geography 22, price 16, customer 14, seasonality 10, marketplace signals 10)
- [x] Out-of-scope brand rejection (Michelin/Total/Samsung never reach Supabase)
- [x] Better Contact payload with LinkedIn URL + company_name + job_title (high hit rate)
- [x] On-hold detection + auto-switch between primary/fallback BC keys
- [x] Mirakl Team signature sanitizer (strips [placeholders], forces canonical sign-off)
- [x] Custom user prompt regeneration (priority="highest" override block)

## Ready to deploy, pending key

- [ ] **SMTP_PASS** set locally but needs to be on Vercel too (`vercel env add SMTP_PASS production`)

## Batch in progress

- [ ] Enrichment batch of 352 sellers (5 BC tasks `in progress` on fallback key, ETA 25-45 min)

## Optional follow-ups

- [ ] Supabase Auth + RLS (currently single-tenant, no user system)
- [ ] Pipeline Kanban persistence (drag/drop state lives in Zustand only, not persisted server-side)
- [ ] Webhook mode for Better Contact (instead of polling — removes the 60s Vercel cap entirely)
- [ ] Analytics table `enrichment_runs` to track BC spend + hit rate per batch
- [ ] `scrape_one.py` DDG regex is legacy — superseded by OpenAI classifier in the API route; safe to delete
- [ ] Rotate the GitHub PAT committed in conversation history (revoke at https://github.com/settings/tokens)

## Platform URLs for handover

- Production: https://mirakl-prospector.vercel.app
- GitHub: https://github.com/CodeurFort/mirakl-prospector
- Vercel project: https://vercel.com/aurian/mirakl-prospector
- Supabase dashboard: https://supabase.com/dashboard/project/bugplcpxjpyapoatrrzz
- Better Contact: https://app.bettercontact.rocks
- Apify: https://console.apify.com
- OpenAI usage: https://platform.openai.com/usage

## Credentials in scope

Where each secret lives:

| Secret | `.env.local` (laptop) | Vercel production | `scraper/.env` |
|---|---|---|---|
| Supabase URL / key | ✓ | ✓ | ✓ |
| OpenAI key | ✓ | ✓ | — |
| Better Contact primary | ✓ | ✓ | ✓ |
| Better Contact fallback | ✓ | ✓ | ✓ |
| SMTP HOST/PORT/USER/FROM | ✓ | ✓ | — |
| SMTP_PASS (app password) | ✓ | *to add* | — |
| Apify token | — | — | ✓ |
| Apollo key | — | — | ✓ (optional) |
