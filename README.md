# InsightFlow

> Owner: M1

Phase 1 build project. See CHALLENGES.md for team notes and the roadmap
document (insightflow-phase-1.html) for the full ownership map and timeline.

## Getting Started

```
npm install
cp .env.example .env   # then fill in MONGODB_URI etc.
npm run dev
```

On every start, the terminal prints a clear MongoDB connection status:

```
────────────────────────────────────────────────
✔ MongoDB: connected  (db: "insightflow", 312ms)
────────────────────────────────────────────────
```

or, if it can't reach the cluster:

```
────────────────────────────────────────────────
✘ MongoDB: NOT connected
  db: "insightflow"  reason: <driver error message>
  Check MONGODB_URI, Atlas network access (IP allowlist), and your internet connection.
  The app will still run — pages that need data will show an empty state until this is fixed.
────────────────────────────────────────────────
```

You can also check the live status anytime at `GET /api/health`, which
returns `{ ok, mongo: { connected, dbName, status, error, tookMs }, timestamp }`.

A failed connection no longer sticks around until a restart — the client
retries on the next request once the underlying issue (URI, network, Atlas
IP allowlist) is fixed.

## Sample data

The dashboard (`/dashboard`) only shows charts once there's at least one
dataset in MongoDB — right now nothing in the app writes data in yet (the
upload flow at `/datasets` is still a placeholder). To see the real
dashboard with data, seed a sample dataset:

```
npm install       # picks up the tsx dev dependency, only needed once
npm run seed
```

This inserts one sample "Sample Coffee Shop — Last 90 Days" dataset plus
~90 days of realistic sales rows (weekday/weekend patterns, a mild upward
trend) into your MongoDB. Reload `/dashboard` afterwards — it'll appear in
the dataset selector automatically. Safe to run more than once; each run
adds a new dataset rather than overwriting the last one.
