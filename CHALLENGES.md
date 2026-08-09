# Challenges log

> **This file is graded.** It must not be written from memory on the last day — an
> entry written a week late is obvious to read and worth less than one written the
> day it happened. Append two lines at the end of each working day, while you still
> remember what you actually tried.

Two lines per person per day:

- **Blocked:** what stopped you, specifically
- **Fixed:** what actually solved it, or what you tried and where you are stuck

Newest day at the top. Add your day above the previous one. Never edit somebody
else's entry.

---

## 2026-08-10

**Codex (on M1's behalf) - presentation PR mixed valuable landing work with two contract regressions**

- **Blocked:** PR #34 added the agreed screenshots, private/public comparison, and
  recent insight cards, but its last commit normalized line endings before checking
  the sample CSV, and its landing endpoint read private outcome measurements without
  a separate publication-consent field.
- **Fixed:** Restored exact byte-for-byte CSV verification and kept the outcome story
  visual by using the fictional private-workspace screenshot instead of querying the
  outcomes collection. Typecheck, both deterministic presentation verifiers, the full
  production build, and the corrected landing page all passed.

---

## 2026-08-09

**Codex (on M1's behalf) - presentation data needed reproducibility and safe ownership boundaries**

- **Blocked:** The existing additive seed creates a new data set on every run, the
  default seed wipes shared collections, the date and Mongo ids change between
  runs, and the requested sample download crosses from M1 into M2-owned files and
  a previously unassigned `public/` directory.
- **Fixed:** The project owner authorized the cross-module presentation work and
  chose best-practice defaults. The implementation is being split into verified
  steps, beginning with a fixed-date, locally seeded Mulberry32 generator whose
  record ids are derived from stable SHA-256 entity keys.

---

## 2026-08-06

**Claude (on M1's behalf) — sign-in was broken and the database was empty, with several collections never wired to real data**

- **Blocked:** Sign-in failed on a fresh/empty database because the admin role had
  no fallback path — `server/api/auth/login.post.ts` only ever built an env-var
  fallback for `business_owner` (`config.authUsername`/`config.authPassword`).
  `nuxt.config.ts`'s `runtimeConfig` also never read `ADMIN_USERNAME`/`ADMIN_PASSWORD`
  at all, even though they were documented in `.env.example`, so there was no way
  to reach `/admin` before running `npm run seed` — and no way to run it
  meaningfully without real credentials in the first place. Separately,
  `recommendations/index.vue` and `recommendations/rules.vue` were still on
  `DEMO_RECOMMENDATIONS`/`DEMO_RULES` with no server route behind them at all —
  `server/api/rules/**` and `server/api/recommendations/**` (beyond a bare create)
  didn't exist — and the landing page's insight teaser was a hardcoded "Bella
  Pizza" card rather than reading from Mongo.
- **Fixed:** Added a matching admin env-var fallback in `login.post.ts` and wired
  `adminUsername`/`adminPassword` through `runtimeConfig`. Built out full CRUD for
  both `rules` (`GET/POST/PATCH/DELETE`) and `recommendations`
  (`GET/POST/DELETE`), added the `action` field the UI already referenced to
  `recommendationSchema`, and rewired both pages off demo data. Added
  `GET /api/home-stats` (public, SWR-cached) and pointed the homepage's insight
  teaser at it with a clean empty-database fallback. Extended `scripts/seed.ts` to
  seed `rules` and `recommendations` too (previously only 4 of 6 collections),
  and to print every seeded account's credentials at the end of the run instead
  of leaving them to be guessed from `.env.example`. Replaced the
  `"change-me-before-deploying"` password default with real random values in
  `.env.example` so a fresh checkout isn't stuck with a guessable admin password.

---

## 2026-08-01

**M1 — the data set form could not submit, and it failed silently**

- **Blocked:** The create form at `app/pages/datasets/new.vue` was bound to
  `datasetSchema` and generated its own id in the browser, `ds_4luro9l`. That can never
  satisfy `idSchema`, which requires 24 hexadecimal characters. Because there was no
  input on screen for `id`, the validation error had nowhere to render: clicking Save
  did nothing at all, with no message. Proved it by running
  `datasetSchema.safeParse()` against the exact object the form built —
  `BLOCKED on "id"`.
- **Fixed:** The real cause was a gap in the contract, not a mistake in the page. No
  create schema existed, so the form had been built against the shape of a *stored
  record*. Added `datasetCreateSchema` with only the five fields an owner types, moved
  id and timestamps to the server, and documented the record-versus-create rule in
  `CLAUDE.md`, `shared/README.md` and `docs/DESIGN-SYSTEM.md`. Lesson for everyone: if
  a form does nothing when you click submit, check for a validation error on a field
  that is not displayed.

---

<!--
Copy this block for your entry:

## YYYY-MM-DD

**M? — one line naming the problem**

- **Blocked:**
- **Fixed:**
-->
