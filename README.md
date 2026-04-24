# Mirakl Prospector

BDR tooling for Mirakl Connect. Qualifies e-commerce brands against marketplace profiles, enriches their decision-maker contacts, and generates ready-to-send email sequences.

**Production** : https://mirakl-prospector.vercel.app

## Repository layout

```
mirakl-prospector/          # Next.js 16 App Router · deployed on Vercel
├── src/
│   ├── app/                # pages + API routes
│   │   └── api/            # 9 route handlers (all pure TS, no Python spawn)
│   ├── components/         # React 19 UI (Tailwind 4, Zustand state)
│   ├── lib/                # scoring engine + OpenAI prompts + Supabase client
│   └── store/              # Zustand workspace store (persists in localStorage)
│
├── scraper/                # Python 3 toolkit · runs locally, not on Vercel
│   ├── main.py             # marketplace scrape (Zalando, La Redoute, …)
│   ├── find_contacts.py    # Apify Google → LinkedIn profiles → names + titles
│   ├── enrich_hybrid.py    # Better Contact + pattern/MX/SMTP probe
│   └── …
│
└── deliverable/            # technical export package (see deliverable/README.md)
```

## Quick start

### Next.js app

```bash
cp .env.example .env.local
# fill in SUPABASE, OPENAI, BETTERCONTACT, SMTP keys
npm install
npm run dev
```

### Python scraper (optional, laptop-only)

```bash
cd scraper
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# fill in keys
python3 find_contacts.py
python3 enrich_hybrid.py
```

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind 4, Zustand, Recharts |
| Backend | Next.js API routes (Node runtime, serverless) |
| LLM | OpenAI GPT-4o (classification + email generation) |
| Enrichment | Better Contact API, Apify Google Search, DNS/SMTP probe |
| DB | Supabase (PostgreSQL) |
| Email | nodemailer over Google Workspace SMTP |
| Hosting | Vercel (auto-deploy from `main`) |

## Deployment

Connected to Vercel (project `mirakl-prospector`, team `codeurfort`). Push to `main` deploys automatically. Production URL : https://mirakl-prospector.vercel.app

Env vars are managed via `vercel env add`. See `deliverable/DEPLOY.md` for the full procedure.

## Documentation

See the [`deliverable/`](./deliverable) folder for the complete technical package (architecture, prompts, scoring, schema, costs).
