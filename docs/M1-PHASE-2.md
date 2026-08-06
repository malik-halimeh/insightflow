# M1 — Phase 2 build brief

Everything Member 1 is responsible for in Phase 2, with enough of the existing
codebase described that a plan can be made without reading it first.

> **If you are an AI assistant reading this to help plan:** this is a real,
> working Nuxt 4 codebase with four other people building in it simultaneously.
> Do not propose changes outside the files listed under "What M1 owns". Do not
> propose new dependencies. The constraints section is not advisory.

---

## 1. The three things M1 delivers

| # | Deliverable | Why it is M1's |
| --- | --- | --- |
| **A** | **Feature flags** — one boolean per Phase 2 feature | Lets four people merge unfinished work without it appearing in the live demo |
| **B** | **Forecast engine + read endpoint** | Pure maths, read by a screen someone else builds |
| **C** | **Dataset versioning backend** | Append-only writes; the riskiest data change in the phase |
| **D** | **`ForecastBandChart.vue`** | One shared chart component, so no one else adds a chart library |

There is a fifth job that is not code and comes first — see section 3.

---

## 2. What M1 owns (exact paths)

**New in Phase 2:**

```
shared/schemas/forecast.ts              new
shared/schemas/datasetVersion.ts        new
server/utils/forecast.ts                new
server/api/forecast/**                  new
server/api/datasets/versions/**         new   ← carve-out, see below
app/components/ui/ForecastBandChart.vue new
```

**Already M1's, and will need edits:**

```
nuxt.config.ts             feature flags in runtimeConfig, routeRules for new endpoints
server/utils/db.ts         DatasetVersionDoc type + datasetVersionsCollection accessor
server/utils/indexes.ts    COLLECTIONS entry + indexes for the new collection
shared/schemas/index.ts    export the two new schema files
scripts/seed.ts            seed a couple of versions so the history page is never empty
docs/**                    announce the contracts
```

> ### The carve-out
> `server/api/datasets/versions/**` sits inside `server/api/datasets/**`, which
> belongs to **M2**. The versions subfolder is **M1's**; everything else under
> `server/api/datasets/` stays M2's. This is the only exception in the project and
> it is written into `CLAUDE.md`, `docs/HANDOFF.md` and `docs/PAGE-INVENTORY.md`.

**Not M1's, do not touch:** `app/pages/forecast/**` (M3),
`app/pages/datasets/[id]/history.vue` (M2), `server/api/outcomes/**` and
`shared/schemas/outcome.ts` (M4), `server/api/benchmarks/**` and
`shared/schemas/benchmark.ts` (M5).

---

## 3. Do this first: publish the contracts

**Two people cannot start until M1 posts the response shapes.** M3 builds the
forecast screen and M2 builds the history screen; both are told to build against a
written shape with a hard-coded example, then swap in `useFetch` when the endpoint
lands.

So the order is:

1. Write `shared/schemas/forecast.ts` and `shared/schemas/datasetVersion.ts`
2. Post both, plus an example JSON payload per endpoint, in the team chat
3. **Then** build the implementations

Getting this backwards is the single biggest risk in the module. It is not a
correctness risk — it is two people idle for three days.

---

## 4. The existing codebase, as it actually is

### Stack — closed list, nothing may be added

Nuxt 4 (`app/` srcDir, `server/` and `shared/` at repo root) · TypeScript, no `any` ·
Vue 3 `<script setup>` · Nuxt UI v4 · Zod 4 · MongoDB via the official `mongodb`
driver, **no Mongoose** · deployed on Render with `nuxt build`.

### How a schema is written

Every schema lives in `shared/schemas/`, is exported from `shared/schemas/index.ts`,
and is imported by both client and server as `#shared/schemas`. Existing files to
copy the style from: `dataset.ts`, `salesRow.ts`, `publishedInsight.ts`.

Shared primitives already exist in `shared/schemas/common.ts`:

```ts
idSchema           // 24-character hex string — a Mongo ObjectId as text
isoDateSchema      // "2026-08-07"           — a calendar day
isoDateTimeSchema  // full ISO timestamp
```

**The record/create split is mandatory.** A stored record has `id` and timestamps;
the thing a client submits does not. Forms bind to the `…CreateSchema`, never the
record schema. See `datasetCreateSchema` in `dataset.ts`.

### How the database layer works

`server/utils/db.ts` exposes typed accessors. Adding a collection means three edits:

```ts
// server/utils/indexes.ts
export const COLLECTIONS = { users: 'users', datasets: 'datasets', salesRows: 'salesRows',
  recommendations: 'recommendations', rules: 'rules', publishedInsights: 'publishedInsights' } as const
//  + datasetVersions: 'datasetVersions'

// server/utils/db.ts
export type DocOf<T> = Omit<T, 'id'> & { _id: ObjectId }
export type DatasetVersionDoc = DocOf<DatasetVersion>
export const datasetVersionsCollection = () => collection<DatasetVersionDoc>(COLLECTIONS.datasetVersions)
```

**The storage convention:** documents keep Mongo's `_id: ObjectId` and drop the
contract's `id`. Foreign keys such as `datasetId` are stored as **24-hex strings**,
not ObjectIds, so shared schemas validate stored documents with no conversion layer.
Follow this exactly — mixing the two is the kind of thing that only breaks later.

Indexes go in `ensureIndexes()` in `server/utils/indexes.ts`. `createIndex` is
idempotent and the call is cached per process.

### Shapes you will read from

```ts
Dataset   { id, name, businessType, periodStart, periodEnd, rowCount,
            currentVersionId: string | null, notes?, createdAt, updatedAt }

SalesRow  { id, datasetId, date, itemName, category?, quantity, unitPrice, revenue }
```

`datasets.currentVersionId` **already exists and is always `null`.** It was added in
Phase 1 in anticipation of exactly this work. Phase 2 makes it the pointer to the
current version — you do not need to add the field, only start using it.

### Server route conventions

Routes are `defineEventHandler` files under `server/api/`, named by method:
`index.get.ts`, `[id].delete.ts`, `versions.post.ts`. Private routes call
`requireSession(event)` from `server/utils/auth.ts` first; admin-only routes call
`requireAdmin(event)`.

Errors use `createError({ statusCode, statusMessage })`, and `statusMessage` is shown
to the owner — so write it as a sentence a small-business owner would understand, not
as a code.

### Existing runtimeConfig

```ts
mongodbUri, mongodbDb, authUsername, authPassword, sessionSecret,
elasticEmailApiKey, elasticEmailFromEmail, elasticEmailFromName,
public: { siteUrl }
```

Feature flags get added here. Note these are **not** `NUXT_`-prefixed, so they bake in
at build time; overriding one on Render needs the `NUXT_`-prefixed form
(`NUXT_MONGODB_URI` and so on).

### Existing routeRules

```ts
'/':                    { prerender: true }
'/insights':            { swr: 60 }
'/insights/**':         { swr: 3600 }
'/dashboard/**':        { ssr: false }
'/datasets/**':         { ssr: false }
'/recommendations/**':  { ssr: false }
'/admin/**':            { ssr: false }
'/api/home-stats':      { swr: 300 }
'/api/**':              { cors: true }
```

`/forecast/**` will need `{ ssr: false }` — it is private, per-owner data.

### Analytics endpoints that already exist (M3's, Phase 1)

```
GET /api/analytics/datasets              list of data sets with summary figures
GET /api/analytics/:datasetId/summary    totals, by-weekday, by-category, top items
```

Read these before designing the forecast response. If the forecast endpoint returns a
shape close to the summary endpoint, M3's screen stays consistent with the dashboard.

---

## 5. Deliverable A — feature flags

One boolean per Phase 2 feature in `runtimeConfig`, defaulting **off** in production.
Half a day of work that buys the whole team the ability to merge unfinished work for
the rest of the phase.

Suggested: `forecastEnabled`, `versioningEnabled`, `outcomesEnabled`,
`benchmarksEnabled`. Each read via `useRuntimeConfig()` in the route and the page.

**Do this before any feature work.**

---

## 6. Deliverable B — the forecast engine

### What it is

A **weighted moving average over the last four same-weekdays**, returning a predicted
value and a confidence band. That is the whole model.

### What it is not

Not machine learning. Not ARIMA. Not a regression library. The plan calls this out as
"the most likely way this phase dies" — a weighted moving average is honest,
explainable, takes about an hour, and predicts no better or worse than anything
heavier on twenty rows of restaurant data.

### Shape of the work

- `server/utils/forecast.ts` — **pure functions**: given rows and a horizon, return
  predictions. No database access, no `event`, nothing from H3. Pure means it can be
  tested by calling it.
- **Measure the accuracy honestly:** hold back the last week of seed data, predict it,
  compare against what actually happened. **Keep that number** — it becomes the
  accuracy figure on M3's screen. This is the deliverable that makes the feature
  credible rather than decorative.
- **Minimum-data guard:** fewer than four weeks of rows and there is nothing
  meaningful to predict. Return a flag saying so; M3 renders it as an honest empty
  state. Do not return a confident-looking number built on eight days.
- `GET /api/forecast/:datasetId` — reads the engine, cached with
  `defineCachedEventHandler`.

---

## 7. Deliverable C — dataset versioning

### The design rule

**Never overwrite an upload.** Each upload writes a new version record; the data set
points at the current one via `currentVersionId`. Old versions stay readable. This is
the same append-only thinking that makes financial records trustworthy.

### Endpoints

```
GET    /api/datasets/:id/versions            list, newest first  (M2's page reads this)
POST   /api/datasets/:id/versions/:vid/restore   move the pointer to an older version
```

### What a version record holds

At minimum: which data set, when, how many rows it contained, how many rows were
rejected at import, and enough quality information for the badge (see below).

### Constraints that matter

- **Cap at ten versions per data set.** Every version keeps its rows; without a cap
  the collection grows without limit. Enforce it in the endpoint, when writing.
- **Restore changes what every other module reads** — the dashboard, the
  recommendations, the forecast. The endpoint just moves the pointer; M2's page is
  responsible for confirming with the owner in plain words first.
- **The quality badge is computed here, not in the page.** Missing days, duplicate
  rows, negative or absurd values. Return it in the response; M2 displays it. Warn,
  never block — an owner with imperfect data still needs their dashboard.
- **Deletes cascade in the route, not the database.** When a data set is deleted its
  versions must go too. Mongo will not do this.

---

## 8. Deliverable D — `ForecastBandChart.vue`

`app/components/ui/ForecastBandChart.vue`, referenced by M3 as
`<UiForecastBandChart>` (Nuxt prefixes an auto-imported component with its folder
name — getting this wrong renders nothing at all, silently).

- Takes points and a band as props. M3 passes data in and never opens the file.
- **No chart library.** Hand-drawn SVG. Adding a dependency is a stack-rule violation,
  and this component exists precisely so that nobody else adds one either.
- **Follow the existing precedent:** `app/components/dashboard/RevenueTrendChart.vue`,
  `DayOfWeekChart.vue` and `CategoryBreakdown.vue` are all hand-drawn SVG already.
  Read one before starting; it is the house style for a chart here.
- Draw the **band**, not a bare line. A single confident line implies a certainty the
  data does not support.

> **On `<ClientOnly>`.** CLAUDE.md rule 5 requires it for any component touching a
> chart library or `window`. A pure SVG component touches neither, which is why the
> three existing charts are **not** wrapped — and they render fine. Do not add the
> wrapper by reflex: it costs a loading flash for no benefit. The moment this component
> measures the DOM, reads `window`, or gains a library, the wrapper becomes mandatory.

---

## 9. Hard constraints

1. **No new dependencies.** The stack list is closed. If something seems to need one,
   stop and say so rather than adding it.
2. **No `any`.** `npm run typecheck` must exit 0. Note that `nuxt build` does **not**
   typecheck — a green build proves nothing about types.
3. **Never run `npm run seed`.** It wipes the database all five members share, and it
   has destroyed teammates' work more than once. Use `npm run seed -- --add`.
4. **Never store request-scoped data in a module-level variable.** The host runs
   multiple instances; this loses data in production in a way that is very hard to
   diagnose.
5. **Never commit `.env`,** and never put a working value in `.env.example`. The
   repository is public.
6. **`main` is protected.** Branch from the latest `main`, open a pull request. Direct
   pushes are rejected.
7. **Read `docs/DESIGN-SYSTEM.md` before writing markup.** Every visual question has an
   answer there; no page needs a visual judgement.
8. **Open the browser console before pushing.** A component referenced without its
   folder prefix renders nothing, silently, and typecheck does not catch it.

---

## 10. Definition of done

- [ ] Feature flags in `runtimeConfig`, off in production, before any feature work
- [ ] `forecast.ts` and `datasetVersion.ts` schemas written **and announced**
- [ ] Response shapes posted in writing with example payloads, before implementation
- [ ] Forecast engine written as pure functions
- [ ] Accuracy measured on held-back seed data, and the number kept
- [ ] Minimum-data flag returned when there is under four weeks of rows
- [ ] Versioning: new version per upload, restore endpoint, ten-version cap
- [ ] Quality information computed server-side and returned in the response
- [ ] Version deletes cascade when a data set is deleted
- [ ] `ForecastBandChart.vue` built as hand-drawn SVG, no chart library
- [ ] Indexes added to `ensureIndexes()`
- [ ] `npm run seed -- --add` seeds at least two versions, so the history page is never empty
- [ ] `npm run typecheck` exits 0
- [ ] Verified in a browser with the console open

---

## 11. Suggested order

1. Feature flags
2. Both schemas → **announce them the same day**
3. Post the two response shapes with example payloads
4. Versioning backend (M2 is waiting on this one)
5. Forecast engine + accuracy measurement
6. `ForecastBandChart.vue` (M3 is waiting on this one)
7. Cached read endpoints
8. Seed data for versions

Steps 1–3 are roughly a day and unblock two people. Everything after can take as long
as it takes.

---

## 12. Cut line

If the phase runs long: drop the scheduled recompute and compute forecasts on request
behind the cache. Nobody notices. **Do not** cut the accuracy measurement or the
minimum-data guard — those are what make the feature honest rather than decorative.
