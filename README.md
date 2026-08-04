# RecruitIQ — Complete Deployment Guide (v2.0 Autonomous)

A fully automated job-outreach pipeline: discovers tech & AI/LLM jobs across multiple free APIs, scores them dynamically against your vector resume store, finds recruiter contacts, writes highly personalised cold emails, sends them safely via Gmail, classifies replies, and follows up automatically. **Runs entirely on free tiers — no server to rent, no credit card required anywhere in this stack.**

---

## How it's built, and why

| Piece | What it does | Runs on |
|---|---|---|
| GitHub Actions (`pipeline.yml`) | Discovers jobs (Multi-Source API) → scores → finds contacts → drafts emails | Free cron, every 6h |
| GitHub Actions (`send-emails.yml`) | Sends **one** email per run during business hours via Gmail SMTP | Free cron, every 20 min |
| GitHub Actions (`check-replies.yml`) | Polls Gmail over IMAP for recruiter replies, classifies with Gemini | Free cron, every 30 min |
| GitHub Actions (`followups.yml`) | Automated Day-5 and Day-10 follow-ups | Free cron, weekday mornings |
| Next.js Dashboard (`/dashboard`) | Glassmorphism dark analytics UI reading directly from Supabase | Free Vercel deployment |
| Supabase | PostgreSQL Database + pgvector resume store | Free, 500MB forever |
| Google Gemini | Dynamic job scoring, 768-dim embeddings (`gemini-embedding-001`), reply classification (`gemini-3.5-flash-lite`) | Free tier (aistudio.google.com) |
| NVIDIA NIM | Writes natural-sounding cold emails using `meta/llama-3.3-70b-instruct` | Free tier (build.nvidia.com) |

---

## Part 1 — Collect your free accounts and API keys (~15 min)

| # | Service | Get your key at | Free tier |
|---|---|---|---|
| 1 | Google Gemini | aistudio.google.com → "Get API key" | 1000 requests/day |
| 2 | NVIDIA NIM | build.nvidia.com → Llama 3.3 70B → "Get API Key" | Free serverless inference |
| 3 | Supabase | supabase.com → New Project | 500MB DB, forever free |
| 4 | Hunter.io | hunter.io → sign up → API section | 25 email searches/month |
| 5 | Gmail App Password | myaccount.google.com/apppasswords (needs 2-Step Verification enabled) | Free, no custom domain required |
| 6 | GitHub | github.com | Unlimited public Actions minutes |
| 7 | Vercel | vercel.com → sign up with GitHub | Unlimited hobby deployments |

Keep all keys/passwords in a notes file for a moment — you'll paste them in twice (once
locally to test, once into GitHub Secrets).

---

## Part 2 — Set up the database (Supabase)

1. In your new Supabase project, go to **SQL Editor**.
2. Open `supabase/schema.sql` from this project, paste the whole thing in, and run it.
   It creates every table, the pgvector store, and the helper functions.
3. Open `supabase/resume_chunks.sql`, **replace every placeholder with your real name,
   skills, and project descriptions**, then run it too. This is what the AI reads to
   personalise every email — vague or copied content here means generic emails out.
4. Go to **Storage** → create a new **public** bucket named `resumes` → upload the CV
   PDF already sitting in this project at `resume/Abdul_Rafay_CV.pdf` → click it → copy
   the public URL. You'll need this as `CV_PUBLIC_URL`.
5. Go to **Project Settings → API** → copy your `Project URL`, `anon public` key, and
   `service_role` key. You'll need all three shortly.

---

## Part 3 — Test everything locally before it touches the real world

```bash
cd recruitiq/scripts
npm install
cp ../.env.example ../.env
```

Open `.env` and fill in every real value — all 6 API keys, your Supabase URLs/keys, your
name/email/links, and `CV_PUBLIC_URL` from step 2.4 above.

```bash
node test-all.js
```

Every line should say `PASS`. If `nim` fails, double-check the model name in `NIM_MODEL`
is spelled exactly as it appears on build.nvidia.com. If `gmail_smtp` or `gmail_imap`
fail, double-check the App Password has no stray spaces and that IMAP is enabled in
Gmail's settings. Don't move on until everything passes.

Then, one-time, embed your resume for retrieval:

```bash
node index-resume.js
```

You should see each chunk report "Embedded (768 dims)".

---

## Part 4 — Push to GitHub

```bash
cd recruitiq
git init
git add .
git commit -m "RecruitIQ initial commit"
gh repo create recruitiq --public --source=. --push
```

(No `gh` CLI? Create the repo on github.com, then `git remote add origin <url>` and
`git push -u origin main`.) `.gitignore` already excludes your real `.env` — double check
`git status` doesn't show it before pushing.

**Public vs private:** public is recommended here specifically because it makes GitHub
Actions minutes unlimited, which matters since `send-emails.yml` runs every 20 minutes,
all day. Your actual API keys never appear in the repo — they live in GitHub Secrets,
encrypted, regardless of visibility.

---

## Part 5 — Add your keys to GitHub

Repo → **Settings → Secrets and variables → Actions**.

**Secrets** tab — add each of these (sensitive):
```
GEMINI_API_KEY
NIM_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_KEY
JSEARCH_API_KEY
HUNTER_API_KEY
GMAIL_APP_PASSWORD
```

**Variables** tab — add each of these (not sensitive, just config):
```
NIM_MODEL                    = meta/llama-3.3-70b-instruct
YOUR_NAME                    = your full name
YOUR_EMAIL                   = the Gmail address you're sending from
CV_PUBLIC_URL                = the Supabase Storage URL from Part 2
DAILY_EMAIL_LIMIT            = 20
MIN_RELEVANCE_SCORE          = 70
SEND_WINDOW_START_HOUR_UTC   = 4
SEND_WINDOW_END_HOUR_UTC     = 13
```
(The send window defaults to roughly 9am-6pm Pakistan Time — adjust if most of the
companies you're targeting are in a different timezone.)

---

## Part 6 — Do one full manual test run before trusting the schedule

Repo → **Actions** tab → you'll see all 4 workflows listed. If prompted, click "I
understand my workflows, enable them."

1. Click **RecruitIQ Pipeline** → **Run workflow** → run it manually once.
2. Watch it go green step by step. Then check Supabase's Table Editor:
   - `jobs` should have new rows with `status = qualified` or `rejected`
   - `contacts` should have entries for qualified jobs
   - `outreach` should have drafts with `status = draft`
3. **Read a few of those drafts before anything gets sent.** Do they sound like you, or
   generic? If generic, your `resume_chunks.sql` probably needs more specific, concrete
   detail (real project names, real numbers) — vague input produces vague emails no
   matter how good the model is.

Only once you're happy with the drafts, let `send-emails.yml` run on its own schedule (or
trigger it manually to watch one real send happen).

---

## Part 7 — Deploy the dashboard to Vercel

```bash
cd recruitiq/dashboard
npm install
npx vercel
```

Follow the prompts (link to a new project, accept defaults). Then in Vercel's dashboard
→ your project → **Settings → Environment Variables**, add:

```
NEXT_PUBLIC_SUPABASE_URL       (safe to expose — read-only anon key)
NEXT_PUBLIC_SUPABASE_ANON_KEY  (safe to expose — read-only anon key)
```

That's it — the dashboard only *reads* Supabase to show stats, so there's no server logic
or secret keys needed here anymore. Redeploy after adding env vars (`npx vercel --prod`),
then visit the URL Vercel gives you to see your live stats.

---

## Part 8 — How reply detection actually works now

There's nothing to "wire up" here — `check-replies.yml` runs on its own every 30 minutes,
logs into your Gmail inbox over IMAP, and checks for any unread messages. For each one it
finds, it looks up whether the sender's email matches a contact you've already emailed
(status = `sent`, no reply yet); if so, Gemini classifies the reply (positive / negative /
info request / spam / unclear) and Supabase gets updated — which is what shows up in the
dashboard.

One thing to send yourself as a real test once everything's deployed: reply to one of your
own test outreach emails from a different address you control, wait up to 30 minutes, then
check the `outreach` table in Supabase — you should see `status` flip to `replied` with a
`reply_category` filled in.

---

## Part 9 — You're live. What to check weekly

- Dashboard: sent/replied/positive counts, and whether the daily quota bar is filling up
  as expected on weekdays.
- Supabase `outreach` table: skim a few `draft` rows before they go out, and a few
  `replied` rows to make sure Gemini's classification looks right.
- GitHub Actions tab: green across all 4 workflows. A red run almost always means one API
  key expired or hit its free-tier cap for the day — the error will name which one.

## Safety rules (unchanged, don't bypass)
- Hard cap: 20 emails/day
- Monday–Friday only
- Business-hours send window only
- Every script logs a structured JSON summary + explicit errors, so nothing fails silently
