# scraper/

Python batch toolkit for Mirakl Prospector. Runs **locally on your laptop**, not on Vercel.

Vercel serverless has no Python runtime and no persistent process — anything that takes more than ~50 seconds or runs long-lived crawls lives here. The Next.js app in the parent folder handles everything interactive (single-brand qualification, single contact enrichment, email generation, SMTP send).

## Scripts

| Script | Purpose |
|---|---|
| `main.py` | Initial marketplace scrape (Zalando, La Redoute, etc.) — populates `sellers` |
| `find_contacts.py` | Apify Google Search → LinkedIn URLs → names + job titles |
| `enrich_hybrid.py` | Better Contact for HOT/HIGH sellers, pattern+MX/SMTP probe for the rest |
| `bettercontact_batch.py` | Pure Better Contact batch (80 per payload) |
| `resume_bc_tasks.py` | Recovers results from BC tasks that were submitted but never polled |
| `enrich_one.py` | One-off enrichment for a single seller (legacy, superseded by `/api/enrich-contact`) |
| `scrape_one.py` | One-off scrape (legacy, superseded by `/api/scrape-seller`) |

## Setup

```bash
cd scraper
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env with your keys
```

## Environment variables

See `.env.example`. Key variables:

- `SUPABASE_URL` / `SUPABASE_KEY` — same project as the Next.js app
- `APIFY_TOKEN` — for `find_contacts.py`
- `BETTERCONTACT_API_KEY` (+ optional `_FALLBACK`) — for enrichment
- `APOLLO_API_KEY` — optional, company-size fallback

## Typical run

```bash
# 1. Scrape marketplaces (takes hours, usually done once)
python3 main.py

# 2. Find contact names for sellers without one
python3 find_contacts.py

# 3. Enrich emails (hybrid: BC for top sellers, pattern matching for rest)
python3 enrich_hybrid.py --bc-threshold 72
```

## Better Contact payload

`enrich_hybrid.py` sends every signal we have to Better Contact:

- `first_name`, `last_name`
- `company_domain`
- `company_name`
- `linkedin_url`
- `job_title`

With LinkedIn URL present, BC scrapes the profile directly and returns nominatives emails with high confidence (~80% hit rate).
