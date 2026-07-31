# CLAUDE.md

Standing brief for every session in this repository. Read it before writing any code.

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
3. **Validation schemas live in `shared/schemas/`** and are imported by *both* the client form and the server route. Never write a validation rule twice.
4. **Data fetching:** `useFetch` only at the top level of a page or component. `$fetch` inside event handlers and server routes. Never plain `fetch` in a component.
5. **Any component touching a chart library or `window`** must be wrapped in `<ClientOnly>` with a skeleton fallback.
6. **Never store request-scoped data in a module-level variable.** The host runs multiple server instances; this silently loses data in production. Request state belongs in the H3 event context.
7. **No secrets in the repo.** Everything through `runtimeConfig` and `.env`.
8. **Do not create or edit files outside the folders named in the prompt you were given.**

## FOLDER OWNERSHIP

One owner per folder. Never cross the line — if a task appears to require editing another owner's folder, report the blocker instead of editing.

| Owner | Owns |
| --- | --- |
| **M1** (lead) | `nuxt.config.ts`, `app/app.config.ts`, `shared/**`, `server/utils/**`, `server/api/auth/**`, `app/app.vue`, `app/assets/**`, `app/layouts/**`, `app/middleware/**`, `app/components/ui/**`, `app/pages/index.vue`, `app/pages/login.vue`, `scripts/**`, `docs/**`, `README.md` |
| **M2** | `app/pages/datasets/**`, `app/components/datasets/**`, `server/api/datasets/**` |
| **M3** | `app/pages/dashboard/**`, `app/components/dashboard/**`, `server/api/analytics/**` |
| **M4** | `app/pages/recommendations/**`, `app/components/recommendations/**`, `server/api/recommendations/**`, `server/api/publish/**`, `app/error.vue` |
| **M5** | `app/pages/insights/**`, `app/components/insights/**`, `server/api/insights/**` |

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
