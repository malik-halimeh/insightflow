# CLAUDE.md

Standing brief for every session in this repository. Read it before writing any code.

New to the project? Start with `docs/HANDOFF.md`, then `docs/DESIGN-SYSTEM.md`.
Record what blocked you each day in `/CHALLENGES.md`.

## PROJECT

InsightFlow — a business intelligence tool for small businesses. A signed-in owner uploads sales data and receives plain-language recommendations. Interesting findings can be published to a public, server-rendered insight feed that requires no account.

Two audiences, two access models:

- **Owner surface** — authenticated. Upload, dashboard, recommendations.
- **Insight feed** — public, server-rendered, no account required.

## STACK

Do not substitute anything in this list. If a task seems to need something not listed here, stop and say so rather than reaching for an alternative.

- Nuxt 4 (latest 4.x), TypeScript, Vue 3 `<script setup>`
- Nuxt UI for components; Tailwind utilities only through Nuxt UI
- Zod for all validation
- MongoDB Atlas via the official `mongodb` driver — **no Mongoose**
- Deployed on a Node/serverless preset built with `nuxt build`

## HARD RULES

1. **Nuxt 4 layout.** Application code lives in `app/`. `server/` and `shared/` stay at the repository root, *not* inside `app/`. Never emit a Nuxt 3 path such as `pages/x.vue` — it is `app/pages/x.vue`.
2. **Never run or suggest `nuxt generate`.** It strips the server and kills every API route, the upload, the login and the publish flow. The build command is `nuxt build`.
3. **Validation schemas live in `shared/schemas/`** and are imported by *both* the client form and the server route. Never write a validation rule twice. A form binds to the `…CreateSchema`, never to the record schema: ids and timestamps are assigned by the server, and a browser must never generate a database key.
4. **Data fetching:** `useFetch` only at the top level of a page or component. `$fetch` inside event handlers and server routes. Never plain `fetch` in a component.
5. **Any component touching a chart library or `window`** must be wrapped in `<ClientOnly>` with a skeleton fallback.
6. **Never store request-scoped data in a module-level variable.** The host runs multiple server instances; this silently loses data in production. Request state belongs in the H3 event context.
7. **No secrets in the repo.** Everything through `runtimeConfig` and `.env`.
8. **Do not create or edit files outside the folders named in the prompt you were given.**

## FOLDER OWNERSHIP

One owner per folder. Never cross the line — if a task appears to require editing another owner's folder, report the blocker instead of editing.

| Owner | Owns |
| --- | --- |
| **M1** (lead) | `nuxt.config.ts`, `app/app.config.ts`, `shared/**`, `server/utils/**`, `server/api/auth/**`, `server/api/admin/**`, `app/app.vue`, `app/assets/**`, `app/layouts/**`, `app/middleware/**`, `app/components/ui/**`, `app/pages/index.vue`, `app/pages/login.vue`, `app/pages/admin/**`, `scripts/**`, `docs/**`, `README.md` |
| **M2** | `app/pages/datasets/**`, `app/components/datasets/**`, `server/api/datasets/**`, `server/utils/csv.ts` |
| **M3** | `app/pages/dashboard/**`, `app/components/dashboard/**`, `server/api/analytics/**` |
| **M4** | `app/pages/recommendations/**`, `app/components/recommendations/**`, `server/api/recommendations/**`, `server/api/publish/**`, `server/utils/rules.ts`, `app/error.vue` |
| **M5** | `app/pages/insights/**`, `app/components/insights/**`, `server/api/insights/**` |

### Phase 2 additions

New paths only. Everything above still applies unchanged.

| Owner | Also owns in Phase 2 |
| --- | --- |
| **M1** | `shared/schemas/forecast.ts`, `shared/schemas/datasetVersion.ts`, `server/utils/forecast.ts`, `server/api/forecast/**`, **`server/api/datasets/versions/**`**, `app/components/ui/ForecastBandChart.vue` |
| **M2** | `app/pages/datasets/[id]/history.vue` |
| **M3** | `app/pages/forecast/**` |
| **M4** | `shared/schemas/outcome.ts`, `server/api/outcomes/**`, `app/pages/recommendations/[id]/outcome.vue` |
| **M5** | `shared/schemas/benchmark.ts`, `server/api/benchmarks/**`, `app/pages/insights/benchmarks.vue` |

**Two exceptions to the table above.**

`server/api/datasets/versions/**` sits inside M2's `server/api/datasets/**` but belongs to
**M1**. The rest of `server/api/datasets/` is still M2's. If you are M2, you call those
endpoints, you do not edit them.

`server/utils/outcomes.ts` sits inside M1's `server/utils/**` but belongs to **M4**. It is
the outcome measurement: the two windows either side of the follow date, the readiness
check, and the verdict. That is M4's domain logic and changes with M4's product decisions,
so M1 owning the file would block M4 on M1 for every one of them. It cannot live under
`server/api/outcomes/` instead, because Nitro registers every file there as a route and a
helper module would become an endpoint. One file, named exactly, and the rest of
`server/utils/` is still M1's.

**Schemas.** In Phase 1 every file in `shared/**` was M1's. In Phase 2, M4 and M5 each own
one new schema file, listed above. Nothing else in `shared/` changes owner — and a schema is
still announced to the team in writing before anything is built against it.

## VISUAL DESIGN

`docs/DESIGN-SYSTEM.md` is the design contract. Read it before writing any markup.
Every visual question has one answer there, so no page needs a visual judgement.
Theme changes go through `app/app.config.ts`, which M1 owns — never by overriding a
Nuxt UI component with your own classes.

## STYLE

- TypeScript everywhere. No `any`.
- Small files, one responsibility each.
- No comments that restate the code. Comment only non-obvious decisions.
- No placeholder or TODO code. If something is out of scope, leave it out.
