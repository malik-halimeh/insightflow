# Page inventory

Every page in InsightFlow, who owns it, and what state it is in. Find your row,
read the "replace" column, and leave everything in the "do not change" column alone.

## The two states

| State | Meaning |
| --- | --- |
| **Live** | Loading real data. Do not rebuild it. |
| **Finished** | Needs no data at all. Leave it alone. |

**Every Phase 1 page is now one or the other.** Each was originally a *scaffold* —
designed and styled with fake constants written into the file — and all of them have
since been wired to real endpoints. If you find a `demoState` ref or a `DEMO_` constant
anywhere, it is a leftover and should go.

The Phase 2 pages at the bottom of this file do not exist yet.

---

## M2 — data sets

| Route | File | State |
| --- | --- | --- |
| `/datasets` | `app/pages/datasets/index.vue` | **Live** |
| `/datasets/new` | `app/pages/datasets/new.vue` | **Live** |
| `/datasets/:id` | `app/pages/datasets/[id].vue` | **Live** |

All three read real data. The full API exists: list, create, read, update, delete,
plus `POST /api/datasets/preview` to check a spreadsheet without saving anything
and `POST /api/datasets/:id/rows` to import it. `server/utils/csv.ts` does the
reading.

**Nothing to replace.** The dummy data and the preview-state switcher are gone.

**Do not change:**
- The order on the partial-upload screen. **What worked comes first, always.** An owner
  whose 200-row export had 6 bad lines needs to see the 194 that are fine before the 6
  that are not.
- Re-importing **replaces** the rows of a data set rather than adding to them.
  Appending would let an owner upload the same export twice and watch their
  revenue double.
- The period on a data set is taken from the rows actually imported, not from the
  dates the owner typed, so the dashboard never reports a range with no sales in it.
- The per-line error wording. "Line 47: quantity must be a whole number" tells someone
  where to look. "Validation failed" does not.
- The delete confirmation. It names the row count, the recommendations and the public
  links that disappear. "Are you sure?" gives an owner nothing to weigh.

---

## M3 — dashboard

| Route | File | State |
| --- | --- | --- |
| `/dashboard` | `app/pages/dashboard/index.vue` | **Live** |
| — | `app/components/dashboard/DatasetSelector.vue` | **Live** |
| — | `app/components/dashboard/RevenueTrendChart.vue` | **Live** |
| — | `app/components/dashboard/DayOfWeekChart.vue` | **Live** |
| — | `app/components/dashboard/CategoryBreakdown.vue` | **Live** |
| — | `app/components/dashboard/TopItemsTable.vue` | **Live** |

Reading real figures. `GET /api/analytics/datasets` lists the data sets and
`GET /api/analytics/:datasetId/summary` returns the whole page in one response —
KPIs, daily trend, weekday performance, top items and category mix. The response
shape is `AnalyticsSummary` in `shared/types/analytics.ts`.

**Nothing to replace.** The demo constants and the preview-state switcher are gone.

**Do not change:**
- The **not-enough-data** state, at 28 active days. Eight days of sales cannot show a
  weekly pattern, so the page keeps the totals and drops every comparison. Drawing a
  confident trend over eight days would be a lie told with a chart.
- Best seller and worst seller carry no percentage. A single name has nothing to be
  compared against.
- The charts are **hand-drawn SVG**, drawn with the shared colour tokens so they follow
  dark mode. There is no chart library in this project and adding one is a stack-rule
  violation. Because they touch neither a library nor `window`, they are deliberately
  **not** wrapped in `<ClientOnly>` — see the note in the Phase 2 section below.

---

## M4 — recommendations and publishing

| Route | File | State |
| --- | --- | --- |
| `/recommendations` | `app/pages/recommendations/index.vue` | **Live** |
| `/recommendations/rules` | `app/pages/recommendations/rules.vue` | **Live** |
| — | `app/components/recommendations/RecommendationCard.vue` | **Live** |
| — | `app/components/recommendations/RuleForm.vue` | **Live** |
| — | `app/components/recommendations/ShareButton.vue` | **Live** |
| any error | `app/error.vue` | **Finished** |

Reading real data. The full API exists: `GET /api/recommendations`, rules CRUD under
`server/api/recommendations/rules*`, and publishing under `server/api/publish/` —
`POST` to publish, `GET` to list what is already published, and
`DELETE /api/publish/:recommendationId` to take a public page down. The rule engine
itself is `server/utils/rules.ts`.

**Nothing to replace.** The demo constants and the preview-state switcher are gone.

**Both Phase 1 blockers are closed.** `publishedInsightCreateSchema` exists, and
`recommendationSchema` now carries a required `action` — the plain-language sentence
shown on every card.

**Do not change:**
- Severity shows an **icon and a word**, not just a colour. Roughly one man in twelve
  cannot separate red from green, and this product is nothing but numbers going up and
  down. Never reduce it to a coloured dot.
- Share is a quiet ghost button. The recommendation is what the owner came for.
- The rule builder is **a sentence, not a form**. An owner reads it back and sees
  whether it says what they meant. It wraps to several lines at 360px, which is
  intended. Do not convert it to a grid or stacked labels.
- The unit after the threshold follows the operator — a percentage for the average
  comparisons, days for "unsold for". A rule reading "unsold for 14%" is nonsense.
- The "matches nothing" badge. A dead rule looks identical to a working one otherwise,
  and an owner will wait forever for a finding that cannot arrive.
- In `ShareButton.vue`: **"hide my actual figures" stays on by default**, and the live
  preview stays visible while typing rather than hiding behind a button. Nobody should
  discover what they published by looking at it afterwards.
- In `error.vue`: no status codes on screen, no apologising, and keep the line telling
  the owner their data is safe. That is the actual question in their head.

---

## M5 — public insight feed

| Route | File | State |
| --- | --- | --- |
| `/insights` | `app/pages/insights/index.vue` | **Live** |
| `/insights/:slug` | `app/pages/insights/[slug].vue` | **Live** |
| — | `app/components/insights/InsightCard.vue` | **Live** |
| — | `app/components/insights/InsightMeta.vue` | **Live** |

Already loading real data from `GET /api/insights` and `GET /api/insights/:slug`, both
of which are built. Nothing to replace.

**One gap to close:** `hideAbsoluteNumbers` is never read. The field exists on every
published insight and defaults to `true`, but the feed ignores it. The publish dialog
promises an owner their real figures stay private, and right now nothing keeps that
promise.

**Do not change:** these pages are server rendered on purpose. A stranger with no
account, and a search engine, must see the text in the raw HTML. If you move data
loading into `onMounted` or behind a click, the page still looks right in a browser and
becomes invisible to everyone else.

---

## M1 — shell and shared

| Route | File | State |
| --- | --- | --- |
| `/` | `app/pages/index.vue` | Finished — prerendered |
| `/login` | `app/pages/login.vue` | Live — sign in **and** sign up |
| `/admin` | `app/pages/admin/index.vue` | **Live** — admin only |
| — | `app/layouts/default.vue` | Live — public shell |
| — | `app/layouts/app.vue` | Live — signed-in shell |
| — | `app/layouts/admin.vue` | Live — admin shell |
| — | `app/components/ui/*` | Finished — shared pieces |

### Accounts and roles

Two roles, and they see different halves of the product.

- **`business_owner`** — the workspace: `/dashboard`, `/datasets`, `/recommendations`.
- **`admin`** — only `/admin`, where business-owner sign-ups are approved.

`app/middleware/auth.ts` keeps them apart in the browser, but that is only about
which page someone sees. The real protection is `requireAdmin()` in
`server/utils/auth.ts`, which every route under `server/api/admin/` calls. **If you
add an admin route, call it** — a middleware redirect does nothing to a direct
API request.

A new sign-up is created `pending` and **cannot sign in until an admin approves it**.
The sign-up form always creates a `business_owner`; there is deliberately no public
way to create an `admin`, so the only admin accounts are the ones `npm run seed`
writes.

---

---

## Phase 2 — pages that do not exist yet

Every page below is **new**. Nothing in the Phase 1 tables above is rewritten.

| Route | File | Owner | Reads | Endpoint ready? |
| --- | --- | --- | --- | --- |
| `/forecast` | `app/pages/forecast/index.vue` | **M3** | `GET /api/forecast/:datasetId` | ✅ **live** |
| `/datasets/:id/history` | `app/pages/datasets/[id]/history.vue` | **M2** | `GET /api/datasets/:id/versions`<br>`POST …/versions/:vid/restore` | ✅ **live** |
| `/recommendations/:id/outcome` | `app/pages/recommendations/[id]/outcome.vue` | **M4** | `GET /api/outcomes/:id` | M4 builds it |
| `/insights/benchmarks` | `app/pages/insights/benchmarks.vue` | **M5** | `GET /api/benchmarks` — **public** | ✅ **live** |
| — | `app/components/ui/ForecastBandChart.vue` | **M1** | shared component | ✅ **built** |

**M2 and M3 are not waiting on anything.** Both endpoints are live and both response
shapes are in `shared/` — `datasetVersionSchema` in `#shared/schemas`, and
`ForecastSummary` in `#shared/types/forecast` (explicit path; `shared/types` is not
barrelled).

**Turn your feature flag on first.** Every Phase 2 endpoint answers 404 until the
matching flag is set in your `.env` — see `docs/HANDOFF.md` §6. A 404 saying the
feature is off is the flag working.

**`<UiForecastBandChart>`** takes `actuals` and `points` and draws the band. It is not
wrapped in `<ClientOnly>`, and does not need to be — it is hand-drawn SVG that touches
neither a chart library nor `window`, the same as `RevenueTrendChart.vue`.

**The two screens that only read.** `/forecast` and `/datasets/:id/history` build no
schemas and write nothing to the database. They call an endpoint, render the result, and
show all three states. If either seems to need a change under `server/` or `shared/`,
that is the signal to ask rather than to edit.

**The shared chart.** `<UiForecastBandChart>` is the only chart component in Phase 2.
Pass it points and a band; do not open it. **Do not add a chart library** — there is none
in this project, and adding one is a stack-rule violation.

> **On `<ClientOnly>`.** CLAUDE.md rule 5 requires it for any component touching a chart
> library or `window`. Hand-drawn SVG touches neither, which is why the four existing
> dashboard charts are **not** wrapped and render correctly. Do not add the wrapper by
> reflex — it costs a loading flash for no benefit. The moment a component measures the
> DOM, reads `window`, or gains a library, the wrapper becomes mandatory.

**Rules that carry over to every new page:**

1. Private pages need both lines: `definePageMeta({ middleware: 'auth', layout: 'app' })`.
   `/insights/benchmarks` is the exception — it is public and server rendered, like the
   rest of the feed.
2. Forms bind to a `…CreateSchema`, never to a record schema.
3. `useFetch` at the top level, `$fetch` inside handlers. Never plain `fetch`.
4. Keep loading, empty and ready states. A page that only works once data exists is half
   finished.
5. **Open the browser console before you push.** A component referenced without its folder
   prefix renders nothing at all, silently, and `npm run typecheck` does not catch it. A
   component in `app/components/dashboard/` is `<DashboardThing>`; one in
   `app/components/ui/` is `<UiThing>`.

---

---

## Rules that apply to every page

1. **Do not change class names.** They come from `docs/DESIGN-SYSTEM.md`. If a page
   needs a style that is not in that document, ask M1 rather than inventing one.
2. **Keep all three states.** Every scaffold has loading, empty and ready. A page that
   only works once data exists is half finished.
3. **`useFetch` at the top level of the file. `$fetch` inside functions.** Never plain
   `fetch`.
4. **Forms bind to the `…CreateSchema`,** never the record schema. Ids and timestamps
   belong to the server.
5. **Private pages need both lines:** `definePageMeta({ middleware: 'auth', layout: 'app' })`.
   Without the middleware the page is public.
6. **Run `npm run typecheck` before you open a pull request.** It must exit 0.
7. **Click through all three states before you push.** The bug that cost this team a day
   was a form that did nothing when clicked, because a validation error had no field to
   appear in.
