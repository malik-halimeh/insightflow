# M1 to M4: answers to the outcome-tracking blockers

Paste the whole of this file to your agent as its next message. It answers every
question in its blocker list with a decision, and says which of them are now
already implemented.

---

You raised a blocker list for outcome tracking. I am M1. Every item is answered
below and the answers are final unless I say otherwise in writing. Where an answer
changes a file, the owner of that file is named. Do not edit a file you do not own.

## Already fixed. Stop treating these as blockers.

**The ordinary upload route now records a version and advances the pointer.**
`server/api/datasets/[id]/rows.post.ts` calls `recordVersion(id, documents, report.invalid)`
after `insertMany`, and sets `currentVersionId` from the version it returns. When
`VERSIONING_ENABLED` is off, `recordVersion` returns null and `currentVersionId` is
left alone, so the off path is unchanged. Verified against the database: two
successive uploads produce versions 1 and 2, `currentVersionId` lands on version 2,
`salesRows` holds only the newest upload, and version 1's rows survive in the
archive.

**The deletion lifecycle for versions and archived rows is implemented.**
`server/api/datasets/[id].delete.ts` now removes `datasetVersionRows` then
`datasetVersions` before the rest of the cascade, and reports `uploadHistory` in its
response. It is deliberately ungated: the flag governs whether new history is
written, never whether history already on disk is cleaned up.

**Ownership of the nested restore route is already settled and already written
down.** `server/api/datasets/[id]/versions/**` is M1's, as the carve-out in
CLAUDE.md says and as the docblock at the top of `restore.post.ts` repeats. The
rest of `server/api/datasets/` is M2's. You call those endpoints. You do not edit
them, and neither does M2.

## Decisions you asked me for

### 1. Structured recommendation context

You are right that the scope is currently unavailable on `main`.
`server/utils/rules.ts` computes `group.label` and then interpolates it into
`title` and `body` as prose. It is never stored as a field, so nothing downstream
can match on it.

**Do not add a `scopeValue` field. M5 has already added the field you need, and it
is called `dimensionValue`.** On the `member5-phase2` branch, `recommendationSchema`
gains:

```ts
// Optional while recommendations written before this contract still exist.
dimensionValue: z.string().min(1).nullable().optional(),
operator: ruleOperatorSchema.nullable().optional(),
```

That is the matched scope value, under a better name than the one I was going to
give it, and `operator` comes free with it. Two fields for the same thing under two
names would be the worst outcome here, so build on M5's.

So the only field left for you to add is the direction:

```ts
/**
 * Which way the metric has to move for acting on this finding to have worked.
 * Null on a finding produced before this field existed.
 */
expectedDirection: z.enum(['up', 'down']).nullable(),
```

Nullable, because findings already in the database have none and a non-nullable
field would make every stored record fail validation on read. Match M5's
`.nullable().optional()` shape if you want the two to read consistently.

**Populate `dimensionValue` in `rules.ts` yourself.** M5 added the field to the
schema; nothing writes it yet. Your engine already has the value in `group.label`,
so it is one line in each of `buildComparisonFinding` and the unsold branch.

**Behaviour for a recommendation missing either `dimensionValue` or
`expectedDirection`: the outcome cannot be recorded.** Do not guess, do not
backfill, do not re-derive from the title string. The "Record outcome" control is
disabled on those cards with the reason shown ("This finding was generated before
outcome tracking, so its result cannot be measured"). They age out as data sets are
re-uploaded. Backfilling by parsing a title is the one approach I will reject in
review: it silently produces wrong measurements that look right.

`shared/schemas/**` is mine, but this is your engine's data, so **you write
`expectedDirection` and I review the PR.** Populate it, and `dimensionValue`, in
`rules.ts` at generation time.

### 2. How expected direction is derived

It is not derived. Deriving it from the operator is what your agent correctly
spotted is impossible: `above_average_by` on revenue for a day of week produces
"Saturday is 32% above average", where the advice might be to staff up (expecting
revenue to hold) or to raise prices (expecting it to fall). The operator does not
know.

So the rule author states it. Add to `ruleSchema` in `shared/schemas/rule.ts`:

```ts
/** Which way the metric should move if the advice works. */
expectedDirection: z.enum(['up', 'down'])
```

with a select on the rule form beside `advice`, labelled "If this advice works, the
number should".

**Default the select to "up" for every operator.** Not because the operator implies
it, but because almost all advice in this product is about lifting something that
is underperforming, so "up" is right most of the time and the author only has to
notice on the exception. The exception is real: a rule that fires on an item
selling far above average, whose advice is to raise its price, expects units to
fall. That is precisely the case a derived value would get wrong.

Existing rules have no such field. Migrate them to "up" in `scripts/`, which is
mine to write. Tell me when the field lands and I will run it.

**Copy the resolved value onto the recommendation at generation time.** Do not read
it through `ruleId` at measurement time. An outcome measured six weeks later must
reflect the rule as it was when the finding was made, and rules are editable.
This is also the answer to "behavior when a recommendation or rule disappears after
it was followed": the outcome is self-contained and keeps working, because it never
needed the rule.

### 3. Multi-tenancy: implemented. Per-owner scoping is now live.

You were right to raise it, and the answer went the other way. The product is no
longer single-tenant. Every owned record is scoped to the signed-in account, and
that includes routes in your folder, which I have already changed. Read the section
at the end of this file before you touch them.

What is now true:

- `datasetSchema` carries `ownerId`, assigned by the server from the session.
  `datasetCreateSchema` has no field for it, so a browser cannot set it.
- `ruleSchema` carries `ownerId` too, because a rule is the one owned record that
  hangs off an account rather than a data set. `ruleCreateSchema` omits it
  alongside the id, so your rule form needs no change.
- `SessionPayload` carries `userId`, the account's `_id` as a hex string.
- `server/utils/ownership.ts` is the only thing you should reach for:
  `requireOwnerId(event)`, `requireOwnedDataset(event, id)` and
  `ownedDatasetIds(event)`. Do not write an ownership filter by hand.

**What this means for outcomes.** Almost nothing changes in your schema, and that
is the point. An outcome hangs off a recommendation, a recommendation hangs off a
data set, and a data set carries the owner. So scope outcomes exactly as you were
going to, by `datasetId` and `recommendationId`, and add **no** owner field of your
own. What does change is your routes: every one that reads or writes an outcome
must first prove the data set is the caller's, with `requireOwnedDataset`. A route
that filters by `recommendationId` alone is now a data leak, not merely untidy.

Asking for another account's record answers 404, never 403. A 403 confirms the id
is real, which is a way of enumerating other people's data one id at a time. Match
that behaviour in your own routes.

### 4. Automated tests

There is no test framework, and the stack list in CLAUDE.md does not include one.
That list is binding: adding Vitest is a stack change, and it is mine.

**For Phase 2, do not add a framework and do not block on one.** Put your
verification in `scripts/` as a runnable script that asserts against the real
database and cleans up after itself, which is the pattern I used to verify the two
fixes above. It needs no dependency, it runs with `npx tsx scripts/<name>.ts`, and
it is honest about what it checked. `scripts/` is mine, so send me the file and I
will land it.

### 5. What I owe you once your schema is stable

Confirmed, all four, and none of them are large. Send me the merged
`shared/schemas/outcome.ts` and I will deliver in one pass:

- the barrel export in `shared/schemas/index.ts`
- `OutcomeDoc` and `outcomesCollection()` in `server/utils/db.ts`
- indexes in `server/utils/indexes.ts`: unique on `recommendationId`, plus
  `datasetId` and `status` for the queries your list page will make
- seeded examples in `scripts/seed.ts`, covering improved, worsened, no clear
  effect, and not yet ready

I am not writing them against a draft. One stable schema, one pass.

## Versioning semantics for outcome measurement

### Which version supplies after-period rows

**Always the current one, meaning whatever is in `salesRows`.** Never the archive.

The archive exists so an owner can look at and restore a past upload. It is not a
time series, and the ten-version cap means it is not even complete. Reading after
-period rows out of it would make a measurement that silently changes meaning once
the cap drops a version.

So: measure from `salesRows`, filtered by `datasetId` and the date window. That is
the same source the dashboard, the recommendations and the forecast all read, which
is the property that matters. An outcome that disagrees with the dashboard is worse
than no outcome.

### Frozen or recalculated after a restore

**A completed outcome is frozen. Store the computed result on the outcome document,
not a formula to be re-run.**

Restoring an earlier upload replaces `salesRows` wholesale. A recalculating outcome
would therefore change its answer, or lose it entirely, because an owner clicked
restore to look at something. Freeze on completion and the record stays true to what
was measured when it was measured.

Store alongside the result the `datasetVersionId` that was current when it was
computed. That is provenance, not an input: it lets the interface say "measured
against upload 4" when the data set has since moved on. Never re-read rows through
it.

An outcome that is still pending, not yet completed, has nothing frozen and simply
computes against whatever is current when it becomes ready.

### Outcomes in the deletion lifecycle

Deleting a data set must delete its outcomes. `[id].delete.ts` is M2's file and I
have just edited it once already; **I will add the outcome line myself** when your
collection exists, so M2 is not asked to import a schema she does not own. Do not
edit that file.

## Product decisions

These are mine to make and here they are. All four are chosen so the product never
claims more precision than it has.

**No-clear-effect threshold: ±5%, inclusive at both edges.** A change of exactly
5.0% reads as no clear effect. Small-business weekly figures move several percent on
weather alone, so anything tighter reports noise as a result. Put the constant in
your own module with a comment saying that.

**Missing sales dates: calculate, and warn.** Consistent with `assessQuality`, which
already treats a gap as a warning rather than a block. Set a flag on the outcome
when the after-period has missing days and show it beside the result. An owner whose
export skipped a bank holiday still wants the number; they need to know the gap is
there before they trust it.

**The follow date is the date the owner says they acted, not the date they clicked.**
Default the field to today, let them change it, and reject a future date. Someone
recording on Friday that they changed the menu on Monday is the normal case, and
using the click date would measure four days of the wrong period.

**Readiness requires both: at least 14 calendar days elapsed since the follow date,
and at least 7 distinct sales dates inside that window.** Calendar time alone marks
a data set ready that has had no upload since. Sales dates alone lets a single dense
backfill trigger a measurement across a fortnight that has not happened yet. Until
both are met the outcome is "not yet ready" and says which condition is outstanding.

## Milestone order

Your milestones 1 and 2 are unblocked as of now. Milestone 3 can define the schema
immediately: every semantic it depends on is settled above. Start with the two
recommendation fields in section 1, because your engine has to populate them before
any outcome can be recorded against a new finding.

---

## Changes I already made inside your folder. Pull before you start.

Per-owner scoping had to land in one piece, so I edited eight files under
`server/api/recommendations/` and `server/api/publish/`. **Pull first.** Starting
from a stale copy will conflict on every one of them.

| File | What changed |
| --- | --- |
| `recommendations/index.get.ts` | Picks the caller's own latest data set, not the site's. `rulesToEvaluate` now takes an `ownerId` and the starter-rule fallback is per account. |
| `recommendations/rules.get.ts` | Filters by `ownerId`. |
| `recommendations/rules.post.ts` | Stamps `ownerId` from the session. |
| `recommendations/rules/[id].put.ts` | Matches on `ownerId` as well as the id. |
| `recommendations/rules/[id].delete.ts` | Same. Any account could previously delete any rule. |
| `publish/index.get.ts` | Scoped through `ownedDatasetIds`. |
| `publish/index.post.ts` | Ownership proved via `requireOwnedDataset` on the recommendation's data set. The idempotency check moved to after that check, so a retry can no longer return another account's published insight. |
| `publish/[recommendationId].delete.ts` | Scoped through `ownedDatasetIds`. |

Nothing about the shapes those routes return has changed, so your pages need no
edit. `server/utils/rules.ts` is untouched.

Two things to be aware of while you work:

**Everyone is signed out.** The token now carries `userId`, and one issued before
that is refused rather than guessed at. Sign in again and you will get a fresh one.

**Existing data has no owner and is invisible until it is assigned.** Run
`npx tsx scripts/assign-owners.ts` with no arguments to see what is unassigned and
which accounts exist, then again with `--to <username>`. If your dashboard is empty
after pulling, this is why, and it is not a bug in your code.
