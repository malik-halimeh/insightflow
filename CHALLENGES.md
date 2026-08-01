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
