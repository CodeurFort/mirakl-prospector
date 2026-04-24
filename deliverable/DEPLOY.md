# Deployment

## Production

- URL: https://mirakl-prospector.vercel.app
- Vercel project: `aurian/mirakl-prospector`
- GitHub: https://github.com/CodeurFort/mirakl-prospector
- Auto-deploys on push to `main`

## First-time setup

### 1. Clone

```bash
git clone https://github.com/CodeurFort/mirakl-prospector.git
cd mirakl-prospector
```

### 2. Next.js app

```bash
cp .env.example .env.local
# fill in all keys — see env.example

npm install
npm run dev
# open http://localhost:3000
```

### 3. Python scraper (optional, local only)

```bash
cd scraper
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# fill in keys
```

### 4. Supabase

1. Create a project at https://supabase.com
2. Run `deliverable/supabase-schema.sql` in the SQL editor to create tables
3. Seed the 7 marketplaces (optional — app falls back to BUILTIN_PROFILES if the table is empty)
4. Copy the Service Role key into `.env.local` (SUPABASE_SERVICE_KEY) and `.env` (SUPABASE_KEY)

### 5. Vercel

If you want your own Vercel project (instead of using the shared one):

```bash
npm i -g vercel
vercel login
vercel link          # link the folder to a new/existing Vercel project
vercel env add OPENAI_API_KEY production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add BETTERCONTACT_API_KEY production
vercel env add BETTERCONTACT_API_KEY_FALLBACK production
vercel env add SMTP_HOST production          # smtp.gmail.com
vercel env add SMTP_PORT production          # 587
vercel env add SMTP_USER production          # your.sender@yourdomain.com
vercel env add SMTP_PASS production          # 16-char Google App Password
vercel env add SMTP_FROM production          # your.sender@yourdomain.com

vercel --prod --yes
```

## Gmail / Google Workspace SMTP

1. Sign in at https://myaccount.google.com with the sender address
2. Enable 2-Step Verification (required for app passwords)
3. Visit https://myaccount.google.com/apppasswords
4. Create an app password named "Mirakl Prospector" → save the 16-character string
5. Use it as `SMTP_PASS` (the string can be copied with or without spaces, nodemailer handles both)

## Continuous deployment

- Every push to `main` triggers a Vercel deploy.
- Preview deploys are created for other branches + PRs.
- Env vars propagate automatically (Vercel respects `production`, `preview`, `development` scopes).

## Typical day-to-day commands

```bash
# Local dev
npm run dev

# Force a manual production deploy
vercel --prod --yes

# Trigger the scraper (laptop only)
cd scraper
python3 find_contacts.py           # once per month: refresh names/LinkedIn
python3 enrich_hybrid.py           # once per month: refresh emails

# Inspect prod env vars
vercel env ls production
```

## Troubleshooting

### `ENOENT: spawn python3`
Old versions of the API routes spawned Python. Since April 2026 they are pure TS, but if you see this, you're on a stale build. `git pull && vercel --prod --yes`.

### `BETTERCONTACT_API_KEY manquante`
Set the env var in Vercel (`vercel env add BETTERCONTACT_API_KEY production`) and redeploy.

### Emails stuck in `on hold`
The primary BC key is out of credits. Either top it up at https://app.bettercontact.rocks, or submit using the fallback key (the code auto-switches now, but you can also swap the env vars manually).

### SMTP send returns 534
Google rejected the app password. Regenerate a fresh one at https://myaccount.google.com/apppasswords, update `SMTP_PASS` locally and in Vercel, redeploy.

### Next.js 16 breaks after `npm install`
This project uses Turbopack and Next 16 — pin the `next` version in `package.json` if you need the exact behaviour (currently `16.2.4`).
