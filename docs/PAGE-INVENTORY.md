# Page inventory

Every page in InsightFlow, who owns it, and what state it is in. Find your row,
read the "replace" column, and leave everything in the "do not change" column alone.

## The three states

| State | Meaning |
| --- | --- |
| **Scaffold** | Fully designed and styled, filled with fake data written into the file. Your job is to swap the fake data for real data **without changing the layout**. |
| **Live** | Already loading real data. Do not rebuild it. |
| **Finished** | Needs no data at all. Leave it alone. |

Every scaffold page has a dashed **"Preview state"** dropdown at the top. That is how
you see the loading and empty states while building. **Delete it, and the `demoState`
ref behind it, when you wire real data.**

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
| `/dashboard` | `app/pages/dashboard/index.vue` | Scaffold |

**Replace:** `DEMO_TOTALS` and `DEMO_ITEMS`, the `demoState` ref and its dashed box,
and the two dashed chart boxes — **keep the box, put your chart inside it**.

**You need to build:** `server/api/analytics/**`. Nothing exists there yet.

**Do not change:**
- The **not-enough-data** state. Eight days of sales cannot show a weekly pattern, so
  the page keeps the totals and drops every comparison. Drawing a confident trend over
  eight days would be a lie told with a chart.
- Best seller and worst seller carry no percentage. A single name has nothing to be
  compared against.

**Before you add a chart library:** wrap the chart in a `ClientOnly` component with a
`USkeleton` fallback. Chart libraries touch `window`, which does not exist during
server rendering. This is CLAUDE.md rule 5 and it breaks the build in a confusing way
if you skip it.

---

## M4 — recommendations and publishing

| Route | File | State |
| --- | --- | --- |
| `/recommendations` | `app/pages/recommendations/index.vue` | Scaffold |
| `/recommendations/rules` | `app/pages/recommendations/rules.vue` | Scaffold |
| — | `app/components/recommendations/ShareDialog.vue` | Scaffold |
| any error | `app/error.vue` | **Finished** |

**Replace:** `DEMO_RECOMMENDATIONS` and `DEMO_RULES`, the `demoState` refs and their
dashed boxes, and the empty `onSaveRule`, `onToggle` and `onPublish` functions.

**You need to build:** `server/api/recommendations/**` and `server/api/publish/**`.
Nothing exists there yet.

**Two things are blocked on M1 — ask before you start:**
1. There is no `publishedInsightCreateSchema`. The share form cannot bind to
   `publishedInsightSchema`, because that is the stored record and includes the id and
   the slug. A form bound to it cannot submit.
2. `recommendationSchema` has no field for the suggested action, but the design shows
   one on every card. The field needs adding to the contract.

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
- In the share dialog: **"hide my actual figures" stays on by default**, and the live
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

## Delete this

`app/pages/_stack-check.vue` — a throwaway from day one that proved Nuxt UI and Zod
work together. It has no purpose now and is reachable at `/_stack-check`.

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
