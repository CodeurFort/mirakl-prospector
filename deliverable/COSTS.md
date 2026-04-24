# Costs

All in USD. Prices as of April 2026.

## Unit rates

| API | Unit | Rate |
|---|---|---|
| OpenAI GPT-4o input | 1M tokens | $2.50 |
| OpenAI GPT-4o output | 1M tokens | $10.00 |
| Better Contact | 1 credit (≈1 contact attempt) | ~$0.10 (varies by plan) |
| Apify Google Search | 1000 SERPs | $0.30–0.50 |
| Supabase (free tier) | 500 MB DB, 2 GB transfer/month | $0 |
| Vercel (Hobby) | 100 GB bandwidth/month | $0 |
| Google Workspace SMTP | per email | $0 (own sender) |
| DNS/SMTP probe | per request | $0 |

## Per user action

| Action | Cost | Notes |
|---|---|---|
| Qualify a brand (`/api/scrape-seller`) | **~0.25¢** | 400 in + 150 out tokens, fixed |
| Generate one email (`/api/emails/generate`) | **~1¢** | includes `analyzeCompetitors` (~0.5¢) + `generateEmail` (~0.5¢) |
| Send one email (`/api/emails/send`) | **$0** | SMTP via own workspace |
| Enrich one contact (`/api/enrich-contact`) | **~10¢** | 1 BC credit, win or lose |

## Per full seller funnel

Qualify → enrich → generate 3-mail sequence → send all 3

```
scrape-seller            0.25¢
enrich-contact          10.00¢
competitors analysis     0.50¢  (shared across the 3 mails)
generate × 3             1.50¢
send × 3                 0.00¢
                        ────────
TOTAL                  ~12¢ per seller
```

## Per batch (Python, local laptop)

### `find_contacts.py` — Apify Google Search to get LinkedIn names

One SERP per seller. ~$0.0003 per query.

| N sellers | Cost |
|---|---|
| 100 | $0.03–0.05 |
| 366 (a recent run) | $0.11–0.18 |
| 1000 | $0.30–0.50 |

### `enrich_hybrid.py` — BC for top sellers, pattern+MX for rest

Starting from 354 sellers with `contact_name` and `--bc-threshold 72`:

| Segment | Volume | Unit cost | Sub-total |
|---|---|---|---|
| Score ≥ 72 (BC) | ~150 | $0.10 | **$15** |
| Score < 72 (pattern+MX) | ~200 | $0 | $0 |
| | | **Total** | **~$15** |

**Hit rate drivers** — with the full payload (`first_name`, `last_name`, `company_domain`, `company_name`, `linkedin_url`, `job_title`), BC hits ~80%. Real cost per found email = $15 / 120 ≈ **$0.12**.

Without LinkedIn + job title, hit rate drops to ~30% and real cost per found email jumps to **$0.33**.

### Complete cold catalogue processing (1000 sellers, from scratch)

```
1. Marketplace scrape (main.py)                 $0   (direct scrape)
2. find_contacts.py (Apify)                     ~$0.40
3. enrich_hybrid.py (30% BC, 70% pattern)
   - 300 BC attempts × $0.10                    ~$30
   - 700 via MX/SMTP                             $0
4. Qualification OpenAI (on demand per search)
   - 1000 × 0.25¢                               ~$2.50
5. Generate emails for top 100 sellers
   - 100 × 1.5¢                                 ~$1.50
6. SMTP send                                     $0
                                                ─────────
                                    TOTAL      ~$34
```

**~$35 to process a 1000-brand catalogue end to end.**

## Variables that drive cost

In decreasing order of impact:

1. **BC credits** — tunable via `--bc-threshold` (raise it to reduce BC usage; lower it to improve email coverage on medium-priority sellers).
2. **Hit rate of BC** — directly reduced by enriching the payload with LinkedIn + company_name + job_title. Huge multiplier on effective cost.
3. **Number of emails generated** — 3 per seller by default. Reducing to 1 saves ~$1 per 100 sellers.
4. **Prompt length** — marginal. Plus/minus 10–30% depending on how rich the rationale/signals are.
5. **Qualification volume** — 0.25¢ per brand, linear. For a bulk search of 400 sellers = $1.

## What we do NOT spend money on

- Catalogue storage (Supabase free tier holds the ~400 sellers easily)
- Hosting (Vercel Hobby: 100 GB bandwidth is overkill for this traffic)
- Background jobs (Python scripts run on your laptop, no cloud cost)
- Fallback email discovery (pattern generation + DNS MX + SMTP probe are free)

## Budget ceiling for this prototype

Expected monthly spend assuming 100 new brand qualifications + 20 full seller funnels:

```
100 × 0.25¢   scrape-seller              =  $0.25
 20 × 12¢     funnel (enrich + mails)    =  $2.40
 20 × 0.40¢   Apify (if re-run)          =  $0.08
                                            ───────
                                    TOTAL  <$3/month
```

If you scale to 500 qualifications + 100 funnels: **~$15/month**.
