# CAIS Sourcing Dashboard

SF AI event sourcing for the CustomAI Studio Head of Delivery search.

Every Monday at 06:00 PT, a GitHub Action scrapes ~20 SF AI host calendars
(Latent Space, AGI House, MLOps Community, South Park Commons, AI Tinkerers,
etc.), scores each event against the archetype rubric using Claude Haiku 4.5,
commits the result to `data/events.json`, and emails Andrew the top 5.

The Vercel-hosted Next.js dashboard always reads the latest JSON committed
to `main`.

---

## Architecture

```
┌────────────────────────┐    Mon 06:00 PT
│  GitHub Action (free)  │ ──────────────────┐
│  Playwright + Node     │                   │
└────────────────────────┘                   ▼
            │              ┌──────────────────────────┐
            │  scrape +    │  data/events.json        │
            │  score       │  (committed to main)     │
            └─────────────▶└──────────────────────────┘
                                       │
                                       │ auto-deploy
                                       ▼
                            ┌──────────────────────┐
                            │  Vercel (Next.js)    │  ← Andrew opens
                            └──────────────────────┘

  + Resend sends Monday digest to andrew@customaistudio.io
```

Why this stack: every Monday's snapshot is a reviewable git commit. Manual
overrides are a JSON file edit. No databases, no separate workers, ~$5–15/mo
all-in.

---

## One-time setup

### 1. Accounts you need

| Service | What for | Free tier covers us? |
|---|---|---|
| Vercel | Hosts the dashboard | Yes (Hobby) |
| Anthropic | Scoring (Claude Haiku 4.5) | No — pay-as-you-go, ~$1–5/mo |
| Resend | Sends the Monday digest | Yes (3,000 emails/mo) |

### 2. Configure GitHub secrets and variables

Go to **Settings → Secrets and variables → Actions** on this repo.

**Secrets** (encrypted):
- `ANTHROPIC_API_KEY` — from https://console.anthropic.com
- `RESEND_API_KEY` — from https://resend.com/api-keys

**Variables** (plain text):
- `DIGEST_FROM` — e.g. `digest@yourdomain.com` (must be on a domain you've
  verified in Resend; for testing use `onboarding@resend.dev`)
- `DIGEST_TO` — `andrew@customaistudio.io`
- `DASHBOARD_URL` — your Vercel URL once deployed

### 3. Deploy to Vercel

```sh
# From repo root
npx vercel --prod
```

Vercel will detect Next.js automatically. No config needed.

### 4. Verify the GitHub Action

Open **Actions → Weekly Refresh → Run workflow** and run it manually with
`skip_email = true` for the first run. You should see:

- A green check
- A new commit `chore(data): weekly refresh YYYY-MM-DD` on `main`
- An updated `data/events.json`

Then re-run without `skip_email` to confirm the digest arrives.

---

## Local development

```sh
# Install
npm install
npx playwright install chromium

# Copy env template
cp .env.example .env.local
# Edit .env.local with your keys

# Run dashboard locally (reads data/events.json)
npm run dev

# Run a manual refresh (scrapes + scores + writes JSON, no email)
npm run refresh -- --no-email

# Scrape only, don't write or email
npm run refresh -- --no-write --no-email
```

---

## How to evolve the system

### Add a new host
Edit `lib/sources.ts`. Add a `Host` entry with the right `tier`, `baseScore`,
`url`, and `sourceType` (`"luma"` or `"web"`). The scraper picks it up next run.

### Tune the archetype rubric
Edit `lib/scoring/rubric.ts`. The next run re-scores all events with the new
rubric automatically.

### Manually add an event the scraper missed
Copy `data/manual-events.json.example` to `data/manual-events.json` and add
your event. The refresh script merges it with scraped events. Useful for
Tier 3 invite-only dinners that don't have public Lu.ma pages.

### Pause the cron
Disable the workflow in **Actions → Weekly Refresh** or comment out the
`schedule` block in `.github/workflows/weekly-refresh.yml`.

---

## What the dashboard shows

- **Stats bar**: counts by tier and format
- **Suggested trip**: densest 7-day window of high-fit events in next 60 days
- **Event cards**: title, host, date, venue, fit score, reasoning,
  suggested action, archetype matches
- **Scrape status banner**: which sources succeeded vs failed last run

## What the digest contains

- Top 5 future events by fit score
- Subject line: `CAIS Sourcing · N Tier 1 · M top picks`
- Per-event: 1-line reasoning + suggested action
- Link back to the dashboard for the full list

---

## Cost expectations

| Item | Monthly |
|---|---|
| Vercel Hobby | $0 |
| GitHub Actions (1 run/week, ~10 min) | $0 (free tier: 2,000 min) |
| Anthropic Haiku scoring (~50 events/wk × 4) | $1–3 |
| Resend (4 emails/mo) | $0 |
| **Total** | **~$1–5/mo** |

---

## Known limits / production caveats

- **Lu.ma Cloudflare**: Lu.ma serves a 403 to plain HTTP fetches. Playwright
  bypasses this by running a real headless Chromium. If Lu.ma tightens
  detection (e.g. invisible-Captcha), we'd need to switch to a paid solver
  service like Browserless ($5/mo+).
- **Tier 3 dinners are invisible**: invite-only operator dinners (Hamel,
  Eugene Yan, Jason Liu, SPC member events) don't surface on public
  calendars. Use `data/manual-events.json` to track these once you hear about
  them through other channels.
- **No candidate-overlap layer yet**: this v1 answers "where to be," not
  "who's likely to be there." The overlap layer requires a maintained list
  of 100–200 named candidates — not built yet.
- **JSON-as-database limit**: at ~1,000+ events the file gets unwieldy.
  Migrate to Supabase Postgres at that point.

---

## Files of interest

```
app/page.tsx                   ← main dashboard
components/EventCard.tsx       ← event card component
lib/sources.ts                 ← host registry (edit to add/remove)
lib/scoring/rubric.ts          ← archetype rubric (edit to tune scoring)
lib/scraper/luma.ts            ← Lu.ma scraper (Playwright + JSON-LD)
scripts/refresh.ts             ← weekly orchestrator
.github/workflows/weekly-refresh.yml  ← Monday cron
data/events.json               ← the "database"
prototype/index.html           ← original static prototype (kept for reference)
```
