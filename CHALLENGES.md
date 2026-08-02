# Challenges Log

> Owner: everyone

Use this file to log blockers, questions, and decisions made during the build.

## M3 — Day 2

- **`app/` directory wasn't being picked up by Nuxt.** Build output only
  contained the default "Welcome to Nuxt" starter page — none of our real
  pages. Fixed by adding `srcDir: 'app'` to `nuxt.config.ts`.
- **That fix silently broke every `/api/*` route.** Once `srcDir` is set
  explicitly, Nuxt's `serverDir` default resolves *relative to srcDir*
  (`app/server`) instead of the repo-root `server/` folder we're all using,
  so every API route quietly disappeared from the build with no warning.
  Fixed by pinning `serverDir` to an absolute path in `nuxt.config.ts`
  pointing at the root `server/` folder. Verified with a clean
  `npm run build` — pages, dashboard, and `/api/analytics/*` all present.
- **`server/utils/db.ts` and `shared/types/analytics.ts` were still empty
  stubs** and every API route needs them, so I (M3) implemented a first pass
  of both to unblock analytics. `db.ts` is a standard cached-MongoClient
  pattern reading `MONGODB_URI` / `MONGODB_DB` from `.env` — please review
  and adjust naming if the team wants something different, just keep it in
  sync across routes.
- `.env.example` var names were placeholders (`NUXT_DATABASE_URL`,
  `NUXT_AUTH_SECRET`) that didn't match the real `.env` we're running
  against (`MONGODB_URI`, `AUTH_USERNAME`, etc.) — updated to match.
- Added `mongodb` to `package.json` dependencies (needed by `db.ts`).
- Sandbox note: I could `npm install` + `npm run build` + boot the server
  and confirm all pages and both analytics API routes render/compile
  cleanly, but couldn't reach the real MongoDB Atlas cluster from this
  environment's network, so live data hasn't been exercised end-to-end yet
  — needs a real run on a laptop with normal internet access. Confirmed the
  dashboard degrades gracefully (shows "No datasets yet", not a crash) when
  the DB call fails, so it's safe either way.

## M3 — Day 3

- **A failed Mongo connection stayed failed until server restart.** `db.ts`
  cached the connection *promise*, but never cleared it if `connect()`
  rejected — so one bad attempt (wrong URI, IP not allowlisted yet, brief
  network blip) meant every request after that failed instantly forever,
  even once the real problem was fixed. Now clears the cache on failure so
  the next request retries cleanly, and added a 5s `serverSelectionTimeoutMS`
  so a bad connection fails fast instead of hanging ~30s.
- Added `server/plugins/mongo-status.ts` (prints ✔/✘ MongoDB status to the
  terminal on every `npm run dev`) and `GET /api/health` (same status, on
  demand) — both were asked for directly, not just a side effect of the
  stability fix.

## M3 — Day 4

- **`querySrv ECONNREFUSED _mongodb._tcp....mongodb.net` on startup.** This
  is a DNS issue, not a credentials/allowlist one: `mongodb+srv://` needs the
  resolver to answer SRV/TXT lookups, and some networks (corporate VPN,
  certain containers/sandboxes) don't forward those record types. Fixed by
  pointing Node's DNS resolver at Google/Cloudflare (`8.8.8.8`, `1.1.1.1`) in
  `db.ts`, which do support SRV, before any connection is attempted.
  Documented the non-SRV fallback connection-string format in `.env.example`
  for the rare case where outbound DNS/27017 is blocked entirely and even
  that doesn't help.
- **`scripts/seed.ts` was still an empty stub** (just the "run with" comment),
  so there was no way to get data into the dashboard without building the
  full `/datasets` upload flow first. Implemented it: inserts one sample
  dataset + ~90 days of sales rows (weekday/weekend + trend patterns so the
  charts actually show something) matching the shape `server/api/analytics/*`
  expects. Added `npm run seed` and `tsx` as a dev dependency so it runs
  without an `npx` download each time.
- **`getCollection is not defined` on both analytics routes, plus
  `Failed to resolve component` warnings for every dashboard component.**
  Both are Nuxt/Nitro auto-import (directory-scan) failing to register
  `server/utils/db.ts` exports and `app/components/dashboard/*.vue` —
  seen so far specifically on Windows checkouts under `Downloads`
  (OneDrive/AV file-watcher interference is the likely cause, but the
  underlying scan is inherently less reliable than an explicit import
  either way). Fixed by importing `getCollection` explicitly in both
  analytics API routes, and importing each dashboard component explicitly
  wherever it's used — including `DeltaChip` inside `KpiCard`,
  `RevenueTrendChart`, `DayOfWeekChart`, and `TopItemsTable`, which don't
  go through the dashboard page directly. No longer depends on the
  scanner working at all.
