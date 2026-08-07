# M1 — Phase 2 implementation checklist

Tick as you go. Every item is a real task with a real file behind it.

**Rules that apply to every item below.** `npm run typecheck` must exit 0 before any
push. `main` is protected — branch, pull request, merge. Never run `npm run seed`;
use `npm run seed -- --add`. Never edit a file outside M1's ownership, with the one
declared exception in M1.6.

---

## Gate 0 — decisions that block code

Six contradictions found during planning. Two block day one; the rest block their own
milestone. **Do not start the milestone until its decision is answered.**

- [ ] **C1 — Where do the versioning files live?** `CLAUDE.md` grants
      `server/api/datasets/versions/**`, but both plans specify
      `GET /api/datasets/:id/versions`, which Nitro maps to
      `server/api/datasets/[id]/versions.get.ts`. The granted folder serves a URL
      nobody uses. *Blocks M1.2, M1.7, M1.8.*
- [ ] **C4 — Is `forecast` a schema or a type?** Turns on one question: does the
      recompute write forecasts to MongoDB, or only to Nitro's cache? Mongo → Zod
      schema. Nitro → plain interface, matching `AnalyticsSummary`. *Blocks M1.3.*
- [ ] **C2 — How does "every upload writes a new version" reach `rows.post.ts`?**
      That file is M2's. *Blocks M1.6.*
- [ ] **C5 — Which weekday convention?** `summary.get.ts` uses Monday = 0;
      `rules.ts` and `seed.ts` use Sunday = 0. *Blocks M1.9.*
- [ ] **C3 — Is `ForecastBandChart` wrapped in `<ClientOnly>`?** The global plan says
      yes; `M1-PHASE-2.md` and the three existing charts say it is unnecessary for
      hand-drawn SVG. *Blocks M1.11.*
- [ ] **C6 — Cache a private endpoint while data sets have no owner field?**
      *Blocks M1.12 only.*

---

## M1.1 — Configuration groundwork

**File:** `nuxt.config.ts`

- [ ] Add `forecastEnabled` to `runtimeConfig`, defaulting to `false`
- [ ] Add `versioningEnabled`, defaulting to `false`
- [ ] Add `outcomesEnabled` and `benchmarksEnabled` for M4 and M5
- [ ] Add `'/forecast/**': { ssr: false }` to `routeRules` — **without this M3's page
      server-renders, the session cookie is not forwarded, the endpoint returns 401
      and the shell renders "Signed out"**
- [ ] Comment each flag in the style of the existing `runtimeConfig` block
- [ ] `npm run typecheck` exits 0
- [ ] Confirm the flags read `false` when the env vars are unset
- [ ] Tell M3 the route rule is in place, so they know the page will behave

---

## M1.2 — `datasetVersion` contract

**New file:** `shared/schemas/datasetVersion.ts` · **Modified:** `shared/schemas/index.ts`

- [ ] Define the record: id, `datasetId`, `createdAt`, row counts, rejected count,
      period start/end, quality summary
- [ ] Reuse `idSchema`, `isoDateSchema`, `isoDateTimeSchema` from `common.ts`
- [ ] Model the counts on `UploadReport` in `shared/types/upload.ts` — `total`,
      `valid`, `invalid`, `problems[]`, `periodStart`, `periodEnd`, `imported`
- [ ] **Any nullable link uses `.nullable().default(null)`, never bare `.nullable()`** —
      a bare `.nullable()` rejects `undefined` and one legacy record took the whole
      public feed down once
- [ ] Write validation messages for a business owner, not a developer
- [ ] Export the inferred type alongside the schema
- [ ] Add `export * from './datasetVersion'` to `shared/schemas/index.ts`
- [ ] `npm run typecheck` exits 0
- [ ] Parse a hand-built valid example — passes
- [ ] Parse an example missing an optional field — still passes
- [ ] **Announce it to the team with an example payload**
- [ ] **Confirm M2 has what they need to start**

---

## M1.3 — `forecast` contract

**New file:** `shared/schemas/forecast.ts` **or** `shared/types/forecast.ts` *(see C4)*

- [ ] Define the response: the point series, the confidence band, the accuracy
      figure, and the minimum-data flag
- [ ] Model the structure on `AnalyticsSummary` in `shared/types/analytics.ts` —
      nested `kpis`, arrays of points, a nullable summary object
- [ ] Include the thin-data flag explicitly; **M3 cannot build their honest empty
      state without it**
- [ ] If it lands in `shared/schemas/`, add it to `index.ts`; if in `shared/types/`,
      leave it unbarrelled and import by explicit path, matching the existing four
- [ ] `npm run typecheck` exits 0
- [ ] **Announce it with an example payload**
- [ ] **Confirm M3 has what they need to start**

---

## M1.4 — Database substrate

**Modified:** `server/utils/indexes.ts`, `server/utils/db.ts`

- [ ] Add `datasetVersions: 'datasetVersions'` to `COLLECTIONS`
- [ ] Add `export type DatasetVersionDoc = DocOf<DatasetVersion>` to `db.ts`
- [ ] Add `datasetVersionsCollection()` following the six existing accessors
- [ ] Add index `{ datasetId: 1, createdAt: -1 }` in `ensureIndexes`, named in the
      existing style (`datasetVersions_datasetId_createdAt`)
- [ ] Comment *why* the index exists, as the six existing ones do
- [ ] `npm run typecheck` exits 0
- [ ] Start the dev server, hit any endpoint, confirm the index appears in Atlas
- [ ] Confirm no existing index was renamed or dropped

---

## M1.5 — Versioning write helper

**New file:** `server/utils/versioning.ts`

- [ ] Function to record a version for a data set
- [ ] Enforce the **ten-version cap** inside the helper, not at the call site
- [ ] Compute quality from **stored rows** — gaps in dates, duplicate rows, negative
      or absurd values — so `server/utils/csv.ts` (M2's) is never touched
- [ ] Reuse the `byDate` aggregation pattern from
      `server/api/analytics/[datasetId]/summary.get.ts` for date-gap detection
- [ ] Quality **warns, never blocks** — an owner with imperfect data still gets a
      dashboard
- [ ] Pure enough to call directly in a script, without an H3 event
- [ ] No `any`
- [ ] `npm run typecheck` exits 0
- [ ] Call it against seeded rows and inspect the output
- [ ] Verify the cap: create eleven versions, confirm the oldest is dropped

---

## M1.6 — Integration point handover *(the one cross-member dependency)*

**M1 modifies nothing here.** `server/api/datasets/[id]/rows.post.ts` is M2's file.

- [ ] Write the exact one-line diff that calls `server/utils/versioning.ts`
- [ ] Explain in the message that `deleteMany` → `insertMany` becomes append-only,
      and why (`rows.post.ts:56` currently replaces on purpose)
- [ ] Flag that `rowCount`, `periodStart` and `periodEnd` must follow the new version
- [ ] Send it to M2; **do not edit the file yourself**
- [ ] After M2 merges: upload the same CSV twice
- [ ] Confirm two version records exist and no rows were overwritten
- [ ] Confirm the data set's `currentVersionId` points at the newer version

---

## M1.7 — Versions list endpoint

**New file:** per C1 — `server/api/datasets/[id]/versions.get.ts`

- [ ] `requireSession(event)` first
- [ ] Validate the route param with `ObjectId.isValid`, matching `summary.get.ts:43`
- [ ] 400 for a malformed id, 404 for an unknown data set, both with owner-readable
      `statusMessage` — never a code
- [ ] Return versions newest first
- [ ] Include the quality summary M2 renders
- [ ] Map `_id` → hex-string `id` at the edge, as every other route does
- [ ] Response matches the announced shape **exactly**
- [ ] `npm run typecheck` exits 0
- [ ] Signed out → 401
- [ ] Malformed id → 400
- [ ] Unknown data set → 404
- [ ] Valid request → 200 with the announced shape
- [ ] Data set with no versions → empty array, not an error
- [ ] **Tell M2 the endpoint is live so they can drop the example data**

---

## M1.8 — Restore endpoint

**New file:** per C1 — `server/api/datasets/[id]/versions/[versionId]/restore.post.ts`

- [ ] `requireSession(event)` first
- [ ] Validate both route params
- [ ] Move `currentVersionId` to the chosen version
- [ ] **Move `rowCount`, `periodStart` and `periodEnd` with it** — leaving them behind
      makes the dashboard report one version's totals against another's rows
- [ ] 404 if the version does not belong to that data set
- [ ] Return enough for M2 to confirm what changed
- [ ] `npm run typecheck` exits 0
- [ ] Restore an older version, then call `/api/analytics/:id/summary` and confirm the
      figures changed to match
- [ ] Confirm `/api/forecast/:id` also reflects it, once M1.10 exists
- [ ] Restoring a version from another data set → 404

---

## M1.9 — Forecast engine

**New file:** `server/utils/forecast.ts`

- [ ] Pure functions only — no database access, no `event`, nothing from H3
- [ ] Weighted moving average over the last four same-weekdays
- [ ] Return predicted values **with a confidence band**, never a bare line
- [ ] **Use the weekday convention chosen in C5**, and comment which one and why
- [ ] Reuse `round`, `percentChange` and `weekdayIndex` from `summary.get.ts` rather
      than writing a fourth rounding helper
- [ ] Take `RevenuePoint[]`-shaped input — the daily series already computed for the
      dashboard
- [ ] Return the minimum-data flag when there are fewer than four weeks
- [ ] **No machine learning.** Weighted moving average, nothing heavier
- [ ] No `any`
- [ ] `npm run typecheck` exits 0
- [ ] **Hold back the last week of `buildSalesRows()` from `scripts/seed.ts`, predict
      it, and compare against what actually happened**
- [ ] **Record the accuracy number** — it becomes the honesty metric on M3's screen
- [ ] Verify a data set under four weeks returns the flag, not a prediction
- [ ] Verify the weekday mapping against `describePatterns()` — Friday and Saturday
      should read ~30% above average, Tuesday below

---

## M1.10 — Forecast endpoint

**New file:** `server/api/forecast/[datasetId].get.ts`

- [ ] `requireSession(event)` first
- [ ] Validate the route param with `ObjectId.isValid`
- [ ] 400 / 404 with owner-readable messages
- [ ] Read the **current version's** rows once M1.8 has landed
- [ ] Return the minimum-data flag rather than a confident number under four weeks
- [ ] Include the accuracy figure from M1.9
- [ ] Response matches the announced shape **exactly**
- [ ] Uncached at this stage — caching is M1.12
- [ ] `npm run typecheck` exits 0
- [ ] Signed out → 401
- [ ] Thin data set → flag, no prediction
- [ ] Full seeded data set → a band and an accuracy number
- [ ] **Tell M3 the endpoint is live**

---

## M1.11 — `ForecastBandChart.vue`

**New file:** `app/components/ui/ForecastBandChart.vue`

- [ ] Props: the point series and the band, typed from the M1.3 contract
- [ ] Hand-drawn SVG. **No chart library** — there is none in `package.json` and
      adding one violates the stack rule
- [ ] Reuse the geometry of `app/components/dashboard/RevenueTrendChart.vue`:
      `WIDTH`/`HEIGHT`/`PAD` constants, computed coordinate mapping, `polyline` for
      the line and **`polygon` for the band**
- [ ] Axis labels through `formatMoney` from `#shared/format` — never `.toFixed()`
- [ ] Colours via shared tokens (`stroke-current text-primary`, `text-muted`) so dark
      mode follows automatically
- [ ] `role="img"` with a descriptive `aria-label`
- [ ] A graceful fallback when there are too few points, like the existing chart's
      "one day of sales cannot make a line"
- [ ] Apply the C3 decision on `<ClientOnly>`
- [ ] Class names from `docs/DESIGN-SYSTEM.md` only — no arbitrary values, no
      `<style>` block
- [ ] `npm run typecheck` exits 0
- [ ] Render with a full series, a thin series and an empty series
- [ ] **Open the browser console — it must be clean.** A component referenced without
      its folder prefix renders nothing at all, silently, and typecheck does not catch
      it. This is `<UiForecastBandChart>`
- [ ] Check light mode and dark mode
- [ ] Check it at 360px wide
- [ ] **Tell M3 the component is available**

---

## M1.12 — Caching, seed and documentation

**Modified:** the two read endpoints, `scripts/seed.ts`, `docs/**`

### Caching

- [ ] Apply the C6 decision before caching anything private
- [ ] Convert `/api/forecast/:datasetId` to `defineCachedEventHandler`
- [ ] Convert the versions list if it warrants it
- [ ] **Invalidate on upload and on restore** — reuse `routeCachePrefix()` and the
      `useStorage('cache')` pattern in
      `server/api/publish/[recommendationId].delete.ts`
- [ ] Confirm a cached response is served on a second request
- [ ] Upload new rows, confirm the forecast is **not** stale
- [ ] Restore a version, confirm the forecast reflects it immediately

### Seed

- [ ] Seed at least two versions per demo data set
- [ ] **Add version seeding to both insert branches** — the additive branch (~line
      498) *and* the destructive branch (~line 538). Miss one and `npm run seed --
      --add` diverges from `npm run seed`
- [ ] Set `currentVersionId` on the seeded data set instead of `null`
- [ ] Add version deletion to the wipe list in the destructive branch
- [ ] Print the version count in the seed summary
- [ ] Run `npm run seed -- --add` and confirm nothing was deleted
- [ ] Run it twice and confirm no duplicate-key error
- [ ] Confirm M2's history page is non-empty on a fresh checkout

### Cascade

- [ ] Confirm deleting a data set removes its versions — Mongo enforces nothing, so
      the route must. `server/api/datasets/[id].delete.ts` is **M2's**; if it needs
      the extra line, hand it over as in M1.6

### Documentation

- [ ] `docs/DATA-MODEL.md` — describe `datasetVersions`, its indexes and its cascade
- [ ] `docs/PAGE-INVENTORY.md` — mark `/forecast` and `/datasets/:id/history` live
      once M2 and M3 land
- [ ] `docs/HANDOFF.md` — add the new route rules and the new seeded collections
- [ ] `README.md` — only if a command changed
- [ ] Record what blocked you in `CHALLENGES.md`, the day it happens

---

## Final gates — before calling Phase 2 done for M1

- [ ] `npm run typecheck` exits 0
- [ ] `npm run build` succeeds
- [ ] No `any` anywhere in the new code
- [ ] No `TODO`, `FIXME` or placeholder code
- [ ] No new dependency in `package.json`
- [ ] Every new endpoint calls `requireSession`
- [ ] Every new endpoint returns owner-readable error messages
- [ ] Every new schema field has a message written for a business owner
- [ ] Browser console clean on every page that renders new code
- [ ] Dark mode checked
- [ ] 360px checked
- [ ] Feature flags still default to `false` in production
- [ ] M2 confirms the versions endpoints match what was announced
- [ ] M3 confirms the forecast endpoint and chart match what was announced
- [ ] Nothing outside M1's ownership was edited, except the handovers in M1.6 and the
      cascade line, both made by their owner
