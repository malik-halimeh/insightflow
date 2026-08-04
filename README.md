# InsightFlow

A business intelligence tool for small businesses. A signed-in owner uploads sales
data and gets plain-language recommendations. Interesting findings can be published
to a public feed that anyone can read without an account.

Nuxt 4 · TypeScript · Nuxt UI · Zod · MongoDB Atlas

## Getting started

You need **Node 22 or newer**.

```bash
npm install
cp .env.example .env    # then fill in MONGODB_URI and MONGODB_DB
npm run seed            # loads 8 weeks of demo sales
npm run dev
```

Open http://localhost:3000 and sign in with the `AUTH_USERNAME` and `AUTH_PASSWORD`
from your `.env`.

## Is the database actually connected?

The quickest check, at any time:

```bash
curl http://localhost:3000/api/health
```

```json
{ "status": "ok", "database": "up", "uptimeSeconds": 41, "durationMs": 154 }
```

`"database": "down"` with a **503** means the app is running but cannot reach
MongoDB. It is almost always the Atlas IP access list — see `docs/DEPLOY.md`,
section 1. A failed connection is not cached: once the cause is fixed, the next
request reconnects without a restart.

Sign-in does **not** touch the database, so you can log in successfully while
every page that needs data is failing. Check `/api/health` before anything else.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run seed` | Wipes and reloads the demo data. Safe to run repeatedly. |
| `npm run typecheck` | Must pass before any pull request |
| `npm run build` | Production build |

There is deliberately no `generate` script. `nuxt generate` strips the server out
and silently removes every API route, the login and the upload.

## Documentation

Read these before writing code:

| File | What it covers |
| --- | --- |
| `CLAUDE.md` | The rules. Short, and not optional. |
| `docs/HANDOFF.md` | How the project fits together, for someone new to Nuxt |
| `docs/DESIGN-SYSTEM.md` | How every page must look. No visual decisions required. |
| `docs/PAGE-INVENTORY.md` | Every page, its owner, and what to replace |
| `docs/DATA-MODEL.md` | The collections, how they relate, and the known gaps |
| `docs/DEPLOY.md` | Deploying to Render, and what breaks without each variable |
| `CHALLENGES.md` | The daily log. Append to it the day it happens. |

## Working on this with other people

One owner per folder — the table is in `CLAUDE.md`. Import from anywhere, edit only
your own. **Pull `main` and branch from it at the start of every session.** Building
against a stale copy has cost this team more time than any bug.
