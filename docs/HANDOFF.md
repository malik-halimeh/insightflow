# InsightFlow — handoff

Read this before you write any code. It assumes you have never used Nuxt.

## Read these three files first, in this order

1. **`/CLAUDE.md`** — the rules. Short. Non-negotiable.
2. **`docs/DESIGN-SYSTEM.md`** — how every page must look. **Not optional.**
3. **This file** — how the project fits together.

> **On the design system.** Every page in this project uses those patterns. A page that
> invents its own styling **will be sent back at integration**, however well it works.
> You are not expected to make visual decisions — that is the point of the document.
> Look the answer up and copy the markup.

---

## 1. Running the project

You need **Node 22 or newer**. Check with `node --version`.

```bash
git clone https://github.com/malik-halimeh/insightflow.git
cd insightflow
npm install
```

Then create your environment file:

```bash
cp .env.example .env
```

Open `.env` and fill in `MONGODB_URI` and `MONGODB_DB` — ask M1 for the connection
string. `.env` is gitignored. **Never commit it and never paste it into a chat.**

Load the demo data into your database:

```bash
npm run seed
```

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000 and sign in.

`npm run seed` creates every account below and prints the passwords when it finishes.

**Each of us has two accounts**, so you can see both sides of the product without
borrowing anybody's login. Replace `<name>` with `malik`, `sumayya`, `yasser`,
`dalaa` or `mohammad`:

| Sign in as | Password | Role | Lands on |
| --- | --- | --- | --- |
| `<name>-admin` | `<name>-admin-2026` | admin | `/admin` |
| `<name>-owner` | `<name>-owner-2026` | business owner | `/dashboard` |

So Yasser signs in as `yasser-admin` / `yasser-admin-2026` to review sign-ups, or
`yasser-owner` / `yasser-owner-2026` to use the workspace.

There are also four demo accounts, all with the password `insightflow123` (or
whatever `SEED_PASSWORD` is set to):

| Sign in as | Role | What it is for |
| --- | --- | --- |
| `admin` | admin | The generic admin |
| `owner` (or your `AUTH_USERNAME`) | business owner | Owns the demo data set |
| `thegreenkettle`, `northroadcycles` | business owner | **Cannot sign in — pending approval** |

The last two exist so `/admin` has a real queue to work through. Approve one there
and it can sign in immediately.

**These are development credentials for a shared database and the seed prints them
to the terminal. Never reuse one for anything real.**

You can also sign in with an account's **email** instead of its username, and the
`AUTH_USERNAME` / `AUTH_PASSWORD` pair in `.env` still works on a machine whose
database has not been seeded yet.

**There is no way to create an admin from the browser.** The sign-up form always
creates a business owner, waiting for approval. Admin accounts come only from the
seed, which is what stops anyone from granting themselves access.

Before you open a pull request:

```bash
npm run typecheck
```

It must finish with no errors. This catches most mistakes, including `any`.

**Never run `npm run generate` or `nuxt generate`.** It is not in `package.json` on
purpose. It strips the server out of the build and kills every API route, the login
and the upload.

---

## 2. Folder layout — read this even if you skim everything else

This is **Nuxt 4**. The folder layout changed from Nuxt 3.

> ### ⚠️ Most tutorials you find are Nuxt 3
>
> If a tutorial, a blog post or an AI assistant tells you to create `pages/index.vue`
> or `components/Thing.vue` at the **root** of the project, that is **Nuxt 3** and the
> path is wrong here. In Nuxt 4 those live inside `app/`.
>
> | A Nuxt 3 tutorial says | In this project it is |
> | --- | --- |
> | `pages/dashboard.vue` | `app/pages/dashboard.vue` |
> | `components/Chart.vue` | `app/components/dashboard/Chart.vue` |
> | `layouts/default.vue` | `app/layouts/default.vue` |
> | `middleware/auth.ts` | `app/middleware/auth.ts` |
>
> `server/` and `shared/` are the exceptions: they stay at the **root**, not inside
> `app/`. If you put `server/` inside `app/`, none of your API routes will exist.

```
insightflow/
├── app/                  Everything the browser runs
│   ├── app.vue           The root component
│   ├── app.config.ts     The theme (M1 only)
│   ├── assets/css/       The one stylesheet (M1 only)
│   ├── components/       Vue components, one folder per member
│   ├── layouts/          Page shells
│   ├── middleware/       Route guards
│   └── pages/            Every URL is a file in here
├── server/               Runs on the server only, never in the browser
│   ├── api/              Your API endpoints
│   └── utils/            Database and session helpers (M1 only)
├── shared/               Used by BOTH the browser and the server
│   ├── schemas/          The validation contract (M1 only)
│   └── format.ts         Number formatting
├── scripts/              The seed script
├── docs/                 This file and the design system
└── nuxt.config.ts        Project configuration (M1 only)
```

**How pages become URLs.** A file at `app/pages/datasets/index.vue` is the page at
`/datasets`. A file at `app/pages/datasets/new.vue` is the page at `/datasets/new`.
You never write a router — the filename is the URL.

**Private pages need two lines** at the top of `<script setup>`, or your page is
public and unstyled:

```ts
definePageMeta({ middleware: 'auth', layout: 'app' })
```

---

## 3. Who owns what

One owner per folder. **Never edit another member's folder.** If your task seems to
need it, stop and say so — do not edit and do not work around it.

| Owner | Owns |
| --- | --- |
| **M1** (lead) | `nuxt.config.ts`, `app/app.config.ts`, `shared/**`, `server/utils/**`, `server/api/auth/**`, `app/app.vue`, `app/assets/**`, `app/layouts/**`, `app/middleware/**`, `app/components/ui/**`, `app/pages/index.vue`, `app/pages/login.vue`, `scripts/**`, `docs/**`, `README.md` |
| **M2** | `app/pages/datasets/**`, `app/components/datasets/**`, `server/api/datasets/**`, `server/utils/csv.ts` |
| **M3** | `app/pages/dashboard/**`, `app/components/dashboard/**`, `server/api/analytics/**` |
| **M4** | `app/pages/recommendations/**`, `app/components/recommendations/**`, `server/api/recommendations/**`, `server/api/publish/**`, `server/utils/rules.ts`, `app/error.vue` |
| **M5** | `app/pages/insights/**`, `app/components/insights/**`, `server/api/insights/**` |

You may **import from** any folder. You may only **edit** your own.

---

## 4. The contract — everything in `shared/schemas`

This is the single source of truth. The same schema validates your form in the browser
**and** the request on the server, so a rule is written once.

Import everything from the folder root:

```ts
import { datasetSchema, type Dataset } from '#shared/schemas'
```

`#shared` works from pages, components and server routes alike.

### Records — a row as it is stored

| Import | What it is |
| --- | --- |
| `datasetSchema` / `Dataset` | One uploaded period of sales: name, business type, dates, row count |
| `salesRowSchema` / `SalesRow` | One line of a sale: item, category, quantity, unit price, revenue |
| `recommendationSchema` / `Recommendation` | One finding: title, body, metric, dimension, change, severity |
| `ruleSchema` / `Rule` | One rule the engine evaluates: metric, dimension, operator, threshold, advice |
| `publishedInsightSchema` / `PublishedInsight` | One insight on the public feed: slug, caption, metric, business type |
| `userSchema` / `User` | The signed-in owner |

### Forms — what the owner types

| Import | What it is |
| --- | --- |
| `datasetCreateSchema` / `DatasetCreate` | The five fields for creating a data set |
| `ruleCreateSchema` / `RuleCreate` | A rule without its id |
| `salesRowCreateSchema` / `SalesRowCreate` | One row as it arrives from a spreadsheet. The total is optional — the server works it out when the file omits it |
| `publishedInsightCreateSchema` / `PublishedInsightCreate` | Publishing a finding: display name, caption, hide-figures, and the recommendation it came from |
| `loginSchema` / `LoginInput` | Username and password |

> **Bind forms to the create schema, never to the record schema.** A record schema
> includes `id`, `createdAt` and other fields the *server* fills in. A form bound to it
> can never submit, and because those fields have no input on screen, the error has
> nowhere to appear — the owner clicks Save and nothing happens. If the create schema
> you need does not exist, **ask M1 to add it**.

### Values you can choose from

| Import | Allowed values |
| --- | --- |
| `businessTypeSchema` / `BusinessType` | `restaurant`, `retail`, `gym` |
| `metricSchema` / `Metric` | `revenue`, `quantity`, `orders` |
| `dimensionSchema` / `Dimension` | `dayOfWeek`, `item`, `category`, `hour` |
| `ruleOperatorSchema` / `RuleOperator` | `above_average_by`, `below_average_by`, `unsold_for_days` |
| `severitySchema` / `Severity` | `info`, `opportunity`, `warning` |

### Building blocks

| Import | What it is |
| --- | --- |
| `idSchema` | A record id: 24 hexadecimal characters. **The server creates these — never a browser.** |
| `isoDateSchema` | A calendar day, `2026-03-15`. Used for business dates. |
| `isoDateTimeSchema` | A full timestamp, `2026-03-15T09:30:00.000Z`. Used for record keeping. |
| `slugSchema` | A public URL fragment: lowercase letters, numbers and single hyphens. |
| `SESSION_COOKIE` | The name of the session cookie. |

### Formatting numbers

Separate file, same idea — never format a number by hand:

```ts
import { formatMoney, formatCount, formatPercentChange } from '#shared/format'
```

| Call | Gives you |
| --- | --- |
| `formatMoney(59555.5)` | `£59,555.50` |
| `formatCount(2477)` | `2,477` |
| `formatPercentChange(32.7)` | `+32.7%` |

---

## 5. What is already in the database

`npm run seed` gives you a complete, realistic demo. **You do not need to wait for
anyone's upload feature to start building.**

| Collection | What is there |
| --- | --- |
| `users` | 1 — the demo owner |
| `datasets` | 1 — "Bella Pizza — last 8 weeks" |
| `salesRows` | 631 — eight full weeks ending yesterday |
| `publishedInsights` | 3 — with valid slugs, ready for the public feed |
| `recommendations` | 0 — M4 generates these |
| `rules` | 0 — M4 creates these |

The sales data has **deliberate patterns** so the recommendation engine has something
real to find:

- **Friday and Saturday** run about **30% above** the daily average
- **Tuesday** runs about **18% below** it
- **House Fries** is the volume leader — cheap, sells constantly
- **Beetroot & Feta Salad** barely sells — 15 units in eight weeks
- 12 menu items across 4 categories

**To reseed** — do this whenever your data gets messy:

```bash
npm run seed
```

It **wipes and rebuilds**: users, datasets, salesRows, publishedInsights and
recommendations. It leaves `rules` alone. Running it twice does not duplicate
anything. The ids change every time you reseed, so never hardcode an id.

---

## 6. How each page is rendered, and what it means for you

`nuxt.config.ts` decides where each page is built. This changes how you fetch data.

```ts
routeRules: {
  '/': { prerender: true },
  '/insights': { swr: 60 },
  '/insights/**': { swr: 3600 },
  '/dashboard/**': { ssr: false },
  '/datasets/**': { ssr: false },
  '/recommendations/**': { ssr: false },
  '/api/**': { cors: true }
}
```

| Route | Mode | What it means for the page you are building |
| --- | --- | --- |
| `/` | Built once at deploy | The landing page. No data fetching at all, ever. |
| `/insights`, `/insights/**` | **Server-rendered**, cached | **M5.** Runs on the server first. Your data must load *before* the HTML is sent, so search engines and a visitor with no account see real content. |
| `/dashboard/**`, `/datasets/**`, `/recommendations/**` | **Client-only** | **M2, M3, M4.** The server sends an empty page and your code runs in the browser. |
| `/api/**` | — | Can be called from another origin. |

### Why this matters

**If you are M5 (server-rendered):** use `useFetch` at the top of your page. It runs on
the server, so the content is in the HTML. A stranger with no account must be able to
read your page, so **never** require a session.

**If you are M2, M3 or M4 (client-only):** the server sends an empty shell and your
code runs in the browser. Two consequences:

1. Show a loading state. There is a moment where the page is genuinely empty.
   ```vue
   <USkeleton v-if="status === 'pending'" class="h-8 w-full" />
   ```
2. `window` and `document` exist in your code, because it only ever runs in the
   browser. This is not true for M5's pages — see the `<ClientOnly>` rule in
   `/CLAUDE.md`.

Every private page still needs `definePageMeta({ middleware: 'auth', layout: 'app' })`.
Client-only rendering is **not** a security boundary — your server route must check the
session itself.

---

## 7. `useFetch` or `$fetch` — the one rule people get wrong

**`useFetch` at the top level of a page or component. `$fetch` inside a function.**

`useFetch` is not a way to make a request — it is a way to *declare* data the page
needs. It has to run while the page is being set up. `$fetch` is a plain request you
make when something happens.

### ✅ Correct

```vue
<script setup lang="ts">
import type { Dataset } from '#shared/schemas'

// Top level: the page declares what it needs.
const { data: datasets, status } = await useFetch('/api/datasets', {
  default: (): Dataset[] => []
})

// Inside a handler: a plain request, triggered by the user.
async function remove(id: string) {
  await $fetch(`/api/datasets/${id}`, { method: 'DELETE' })
  await refreshNuxtData()
}
</script>
```

### ❌ Wrong

```vue
<script setup lang="ts">
// WRONG: useFetch inside a function. It will not work, and in dev it warns.
async function loadDatasets() {
  const { data } = await useFetch('/api/datasets')
  return data.value
}

// WRONG: plain fetch in a component. It does not run on the server,
// it does not send cookies the same way, and it has no typing.
const response = await fetch('/api/datasets')
</script>
```

Rule of thumb: **if a button triggers it, use `$fetch`.** If the page needs it to
exist before it can render, use `useFetch`.

In a server route, always `$fetch`. `useFetch` does not exist there.

---

## 8. Nobody edits `shared/schemas` except M1

Four people import from that folder. A change there can break all four at once, which
is why it has one owner.

**If a schema is missing a field, or a rule is wrong, or you need a create schema that
does not exist — ask M1.** It gets changed once, in one place, for everybody.

Do not:

- edit a file in `shared/schemas/`
- copy a schema into your own folder and modify it
- write a second validation rule in your page because the shared one is inconvenient
- generate an `id` in the browser to satisfy a schema

That last one has already cost this team a working feature. The server assigns ids.

---

## Quick reference

| I want to… | Do this |
| --- | --- |
| Start working | `npm install`, `cp .env.example .env`, `npm run seed`, `npm run dev` |
| Reset my data | `npm run seed` |
| Check my work compiles | `npm run typecheck` |
| Know how a page should look | `docs/DESIGN-SYSTEM.md` |
| Know what a schema contains | Section 4, or open `shared/schemas/` and read it |
| Add a field to a schema | Ask M1 |
| Record what blocked me today | `CHALLENGES.md` |
