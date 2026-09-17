# The Vault — Setup Guide (v2)

A private, **read-only** finance tracker for you + 4 friends. Auto-syncs bank
transactions (CIBC, Scotiabank, etc. via Plaid), and now includes trends,
budgets, savings goals, subscription detection, and AI insights — with a
fully redesigned interactive interface.

**Cost: $0/month** within the free tiers below.

---

## What's new in v2

**Security (the important part)**
- 🔐 **Every backend route now requires your login token.** In v1, anyone who
  knew a user's ID could read their entire transaction history from the API.
  Now the backend verifies your Supabase login on every request and only ever
  acts as the account you're actually signed into.
- Rate limiting (stops hammering/abuse) + security headers (helmet).
- The AI insights endpoint is capped at 10/hour so friends can't accidentally
  burn the shared free Gemini quota.
- Fixed a v1 bug where linking a bank failed because the profiles table was
  never populated.

**Features**
- 📈 **Trends** — income vs spending, month by month (tap a month for exact numbers)
- 🔁 **Subscription detection** — finds recurring charges automatically
- 🎯 **Budgets** — set a monthly limit per category, watch the bar fill
- 🏝️ **Savings goals** — with progress rings and a little celebration when you hit one
- 🔍 **Transaction search**, net-worth view across all accounts, balances refresh on sync
- 90 days of history synced (was 30) so trends and subscriptions have data

**Interface**
- Signature **3D holographic balance card** — hold it and tilt it with your finger
- Interactive donut chart (tap a slice to focus it), animated bar charts,
  progress rings, glass panels, haptic feedback, staggered animations
- 5-tab navigation: Home · Trends · Budgets · Goals · Insights

---

## 0. Before you start — safety rules

- Everything here is **read-only**. Nothing in this app can move money, make a
  payment, or authorize anything. It can only *look at* balances and history
  you approve through your bank's own login page.
- **Never** commit your real `.env` to a **public** GitHub repo. It's already
  git-ignored — keep it that way. The mobile app only ever contains public
  keys (the Supabase anon key is designed to be shipped in apps).
- **Test with Plaid's fake sandbox bank first** (Step 5) before touching your
  real accounts. It's free and catches every bug safely.
- Try it alone for a couple of weeks before inviting friends.

## 1. Create your free accounts (~15 minutes)

You need **3 accounts**, which give you **5 values** to paste into config:

| Service | Sign up at | Values you'll get | Free tier |
|---|---|---|---|
| Plaid | https://dashboard.plaid.com/signup | `PLAID_CLIENT_ID`, `PLAID_SECRET` | Sandbox: unlimited & free forever. Real banks: free **Trial plan**, up to 10 linked banks total |
| Supabase | https://supabase.com | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (backend) + `SUPABASE_ANON_KEY` (app) | Free Postgres DB + login emails |
| Google AI Studio | https://aistudio.google.com/app/apikey | `GEMINI_API_KEY` | 1,500 requests/day |

No credit card required for any of the three.

## 2. Set up the database (5 minutes)

1. In your Supabase project: **SQL Editor** → paste all of
   `backend/supabase/schema.sql` → **Run**.
   - Already ran the old v1 schema? Run `backend/supabase/migration_v2.sql`
     instead (adds the budgets + goals tables).
2. **Authentication → Providers** → make sure **Email** is enabled (magic
   links, no passwords).

## 3. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:
- `PLAID_CLIENT_ID` + `PLAID_SECRET` — Plaid dashboard → Team Settings → Keys.
  Start with the **sandbox** secret and `PLAID_ENV=sandbox`.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API.
- `GEMINI_API_KEY` — Google AI Studio.

```bash
npm start
```
Open `http://localhost:4000` — you should see `{"status":"ok", ...}`.
(Every other route will now answer `401 Not logged in` unless called from the
app with a valid login — that's the security fix working.)

## 4. Set up the mobile app

```bash
cd mobile
npm install
```

Fill in `config.js`:
- `BACKEND_URL` — your computer's local IP + `:4000` (find it with `ipconfig`
  / `ip a`; phone and laptop must be on the same WiFi).
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` — the **anon/public** key this time
  (NOT the service role key).

```bash
npx expo start
```
Scan the QR with the free **Expo Go** app.

Note: the Plaid Link widget uses native code, so inside plain Expo Go the
"Connect bank" button may not open. If so, run once:
```bash
npx expo prebuild && npx expo run:android   # or run:ios on a Mac
```
or build a free dev client with `eas build --profile development`. Everything
else (the whole interface) works fine in Expo Go.

## 5. Test with a fake bank first

With `PLAID_ENV=sandbox`, tap "Connect a bank account", pick any test
institution, and log in with username `user_good` / password `pass_good`.
This proves the entire pipeline before your real bank is ever involved.

## 6. Go live with your real accounts

1. In the Plaid dashboard, apply for the free **Trial plan**
   (dashboard.plaid.com/trial-plan — short questionnaire, no card).
2. In `.env`: `PLAID_ENV=production` + your **production** secret.
3. Restart the backend. "Connect a bank account" now shows real banks.
4. The Trial plan allows **10 linked banks total** — plenty for 5 people with
   1-2 banks each, but don't link/unlink repeatedly: removed connections do
   NOT free up slots.

## 7. (Optional) Deploy so it runs 24/7

1. Push `backend/` to a **private** GitHub repo (`.env` stays out — it's git-ignored).
2. Free project on https://railway.app or https://render.com → connect the repo.
3. Copy your `.env` values into their Environment Variables dashboard.
4. Point `BACKEND_URL` in `mobile/config.js` at the new public URL (it'll be
   `https://...` — good, that means traffic is encrypted).

## Adding friends (only after you've used it solo and everything works)

1. They sign up with their email in the app (free magic-link login).
2. They tap "Link a bank account" and log into their own bank.
3. Done. Each person's data is walled off twice: database Row Level Security
   AND the backend, which only ever serves the account you're logged into.

## Known limits

- CIBC occasionally needs a re-login through Plaid (Canadian-bank quirk, not a bug).
- Gemini free tier (1,500/day) is shared across everyone — the app already
  limits insights to 10/hour per person.
- The insights are AI-generated ideas, **not professional financial advice**.
