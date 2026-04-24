# Mirakl Prospector — Technical Deliverable

Complete technical package for handover: architecture, prompts, scoring logic, schema, costs and deployment.

## Platform links

| Resource | URL |
|---|---|
| Production app | https://mirakl-prospector.vercel.app |
| GitHub repo | https://github.com/CodeurFort/mirakl-prospector |
| Vercel project | https://vercel.com/aurian/mirakl-prospector |
| Supabase project | https://supabase.com/dashboard/project/bugplcpxjpyapoatrrzz |
| Better Contact dashboard | https://app.bettercontact.rocks |
| Apify console | https://console.apify.com |
| OpenAI platform | https://platform.openai.com |

## Documents in this folder

| File | Purpose |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Macro architecture, stack, request flow |
| [PROMPTS.md](PROMPTS.md) | All 5 OpenAI prompts used in the app (classifier, email generator, competitor analysis, brand profile, marketplace analysis) |
| [SCORING.md](SCORING.md) | The 6-criteria scoring engine, weights, formulas, reasoning |
| [COSTS.md](COSTS.md) | Per-action and per-batch cost grid with drivers |
| [DEPLOY.md](DEPLOY.md) | Deployment procedure for Next.js (Vercel) + Python scraper (laptop) |
| [CHECKLIST.md](CHECKLIST.md) | What's live, what's pending, what's optional |
| [supabase-schema.sql](supabase-schema.sql) | Complete SQL schema (tables, columns, indexes, ref data) |
| [marketplace-profiles.json](marketplace-profiles.json) | The 7 built-in marketplace profiles used for scoring |
| [env.example](env.example) | Every environment variable the project needs, annotated |

## Top-level repo layout

```
mirakl-prospector/           # Next.js 16 app (deployed on Vercel)
├── src/app/api/             # 9 serverless API routes, all pure TS
├── src/lib/                 # scoring engine + OpenAI prompts + Supabase client
├── src/components/          # React 19 UI (Tailwind 4)
├── src/store/               # Zustand workspace store
│
├── scraper/                 # Python toolkit (runs locally, not on Vercel)
│   ├── main.py              # marketplace scrape
│   ├── find_contacts.py     # Apify Google Search → LinkedIn names
│   ├── enrich_hybrid.py     # BC for top sellers, pattern+MX for rest
│   └── ...
│
└── deliverable/             # THIS FOLDER (technical handover package)
```

## Quick reference: day-to-day commands

```bash
# Local dev
npm run dev

# Deploy to Vercel prod
vercel --prod --yes

# Batch enrichment (laptop only)
cd scraper
python3 find_contacts.py        # find LinkedIn names
python3 enrich_hybrid.py        # enrich emails via BC + patterns
```

## Cost snapshot

| Action | Cost |
|---|---|
| Qualify a brand | ~0.25¢ |
| Enrich a contact | ~10¢ |
| Generate an email | ~0.5¢ |
| Full pipeline on 1000 sellers | ~$35 |

See [COSTS.md](COSTS.md) for the detailed breakdown.
