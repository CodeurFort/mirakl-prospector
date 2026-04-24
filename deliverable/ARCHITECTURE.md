# Architecture

## Overview diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                                │
│   Next.js 16 App Router · React 19 · Tailwind 4 · Zustand persist   │
│   Tabs : Prospection · Outreach · Pipeline                           │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────▼────────────────────────────────────────┐
│              VERCEL · mirakl-prospector.vercel.app                   │
│   Node.js runtime, maxDuration = 60s per invocation                  │
│                                                                      │
│   /api/scrape-seller          OpenAI classify → Supabase → scoring   │
│   /api/enrich-contact         Better Contact submit + poll (45s)     │
│   /api/enrich-contact/status  async status poll (catch-all)          │
│   /api/sellers                list + filters + marketplace profiles  │
│   /api/seller/[id]            single seller detail                   │
│   /api/research               brand → marketplace ranking            │
│   /api/emails/generate        GPT-4o personalised email              │
│   /api/emails/send            nodemailer SMTP (Google Workspace)     │
│   /api/competitors            GPT-4o competitor analysis             │
└──┬─────────────────┬─────────────────┬──────────────────┬────────────┘
   │                 │                 │                  │
   ▼                 ▼                 ▼                  ▼
┌────────┐    ┌────────────┐    ┌───────────────┐   ┌─────────────┐
│Supabase│    │  OpenAI    │    │Better Contact │   │ Google SMTP │
│  (PG)  │    │  GPT-4o    │    │ (email enrich)│   │ (nodemailer)│
└────┬───┘    └────────────┘    └───────────────┘   └─────────────┘
     │ batch writes
     │
┌────┴─────────────────────────────────────────────────────────────────┐
│           PYTHON TOOLKIT · scraper/ (laptop, local)                  │
│   main.py               full marketplace crawl                       │
│   find_contacts.py      Apify Google → LinkedIn slugs (354/409 hit)  │
│   enrich_hybrid.py      BC top sellers + pattern/MX probe otherwise  │
│   resume_bc_tasks.py    recover results after crashed BC polls       │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
        ┌──────────────┐
        │   Apify /    │
        │  DNS / SMTP  │
        └──────────────┘
```

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5.x |
| State | Zustand 5 with persist middleware (localStorage) |
| UI | Tailwind CSS 4, Recharts, Cobe (globe 3D) |
| Backend | Next.js route handlers, Node.js serverless runtime |
| LLM | OpenAI GPT-4o (5 distinct prompts, see PROMPTS.md) |
| Enrichment | Better Contact API · Apify Google Search · DNS/SMTP probe |
| Email send | nodemailer over Google Workspace SMTP (app password) |
| Database | Supabase (PostgreSQL managed, service role on server only) |
| Hosting | Vercel (autoscale, 60s invocation cap) |
| Batch scripts | Python 3.9+ with `curl_cffi`, `dnspython`, `supabase-py` |

## Request flows

### 1. Qualify a brand (single-seller search)

```
User types "AGMES, agmesnyc.com"
  │
  ▼
POST /api/scrape-seller
  │
  ├─► classifyBrandScope (OpenAI)
  │       │
  │       └─ inScope? ───► NO ──► return {outOfScope:true}, no Supabase write
  │                               UI renders the red "hors scope" banner
  │                         YES
  │
  ├─► infer country from TLD (if OpenAI didn't resolve it)
  ├─► resolve ref IDs (category, price, country) from cached ref tables
  ├─► upsert into sellers by seller_name
  ├─► computeCriteria(seller, profiles) → 7 marketplace scores
  ├─► persist top match + match_rationale back to sellers
  │
  └─► return ranked recommendations with criteria breakdown
```

### 2. Enrich a contact

```
User clicks "Enrichir les contacts" on a seller
  │
  ▼
POST /api/enrich-contact { seller_id }
  │
  ├─► load seller (name, domain, contact_name, contact_linkedin, contact_job_title)
  ├─► build BC payload with everything we have
  │     company_domain, company_name, first_name, last_name,
  │     linkedin_url, job_title
  ├─► bcSubmit (primary key, fallback on 401/402/403 or credits error)
  ├─► bcPoll for up to 48s
  │     (recognises: in progress, pending, processing, on hold, queued)
  │
  ├─► terminated? ──► update sellers.contact_email + confidence
  │                   return enriched contact
  │
  └─► timed out? ──► return {pending:true, taskId}
                    client polls GET /api/enrich-contact/status?taskId=X&sellerId=Y
                    which persists the result when BC finishes
```

### 3. Generate email

```
User clicks "Generer le mail 1" (or regenerate with custom prompt)
  │
  ▼
POST /api/emails/generate
  │
  ├─► load seller + joined refs
  ├─► analyzeCompetitors (OpenAI) → 3-5 competitors + presence
  ├─► calculateROI → time savings + cost differential
  ├─► generateEmail (OpenAI)
  │     system prompt: SDR role, no placeholders, Mirakl Team signature
  │     user prompt: inputs + mail_instructions + (user_override if set)
  │
  ├─► sanitizeEmailOutput
  │     strip [placeholders], remove filler ("Your name", "TBD"),
  │     force canonical "The Mirakl Team" signature
  │
  └─► return { subject, body, timing, roi, seller }
```

### 4. Send email

```
User clicks "Envoyer"
  │
  ▼
prompt for recipient (defaults to seller.contact_email or test address)
  │
  ▼
POST /api/emails/send { to, subject, body }
  │
  ├─► create nodemailer transport (Google Workspace SMTP)
  ├─► sendMail
  │
  └─► return { messageId, accepted, rejected }
```

## Data model

**Main tables in Supabase:**

- `sellers` — 409 rows, the working catalogue. Holds category/country/price refs,
  Amazon presence, match_score + top match, and all enrichment fields
  (contact_name, contact_email, contact_linkedin, contact_job_title,
  contact_confidence, enriched_at).
- `marketplaces` — the 7 operator profiles (Zalando, La Redoute, Galeries
  Lafayette, John Lewis, Debenhams, Bloomingdales, Nordstrom).
- `marketplace_matching_profiles` — richer marketplace criteria used by the
  scoring engine (focus categories, target countries, accepted price bands,
  customer positioning, seasonal moments, roles to scrape, signals).
- `ref_product_categories`, `ref_countries`, `ref_price_categories`,
  `ref_customer_categories`, `ref_distribution_types`, `ref_seasonality`
  — lookup tables for typed FKs.

See `supabase-schema.sql` for the exact DDL.

## Split of responsibility: Vercel vs Python

| Work | Where | Why |
|---|---|---|
| Qualify a single brand (<10s) | Vercel | User-facing, synchronous |
| Enrich a single contact (<50s) | Vercel | Interactive, with async fallback |
| Generate a personalised email | Vercel | Synchronous call |
| Send email via SMTP | Vercel | One-shot, nodemailer |
| Initial marketplace scrape (hours) | Python local | Long-running, incompatible with serverless |
| Batch find_contacts on 400 sellers | Python local | 4-min burst, no interactivity |
| Batch enrich 350 sellers | Python local | Cost + SMTP probes require persistent process |

**Rule of thumb** — Vercel handles the interactive stuff; Python handles the long-running batches. Both read/write the same Supabase instance.

## Observability

- Vercel dashboard shows per-route latency, error rate, invocation count.
- Supabase dashboard shows queries, table sizes, realtime events.
- Better Contact dashboard shows credits consumed and task history.
- Python scripts log to stdout (redirect to a file when running under nohup).

## Security

- `SUPABASE_SERVICE_KEY` server-side only (never exposed in `NEXT_PUBLIC_*`).
- All secrets in Vercel env (encrypted) + `.env.local` (gitignored).
- No RLS yet: add Supabase Auth + row-level security when moving to multi-user.
- SMTP uses app passwords, not OAuth — fine for one sender, needs rework for multi-user.
