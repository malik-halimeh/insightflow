# M4 implementation guide: recommendations, rules, and publishing

This guide explains the concepts implemented by Member 4 for InsightFlow Phase 1.
It is written for someone who is new to the project and wants to understand how
the feature behaves and why it was designed this way. It intentionally does not
teach TypeScript, Vue, Nuxt, MongoDB, or command syntax.

## 1. What this part of InsightFlow does

Member 4 owns the path from stored sales data to an actionable recommendation,
and from a private recommendation to an optional public insight.

At a high level, the feature works like this:

1. The owner uploads sales data.
2. Rules describe patterns that are worth finding.
3. The rule engine evaluates those rules against the latest data set.
4. Matching patterns become recommendations stored in the database.
5. The owner can create, edit, disable, or delete rules.
6. The owner can publish selected recommendations to the public insight feed.
7. The owner can later unpublish them without changing the private recommendation.

The private workspace requires a signed-in owner. The public insight page does not
require an account.

## 2. The major concepts

### Sales rows

A sales row is one unit of source data. It includes facts such as the date, item,
category, quantity, revenue, and the data set to which it belongs. The rule engine
does not invent sales information; it only summarises these stored rows.

### Rules

A rule is a reusable business question. It defines:

- a name for the owner;
- the metric to measure, such as revenue, quantity, or orders;
- the dimension used to group the data, such as weekday, item, or category;
- the condition to check;
- the threshold that must be crossed;
- the advice to show when the condition matches; and
- whether the rule is enabled.

For example, a rule can ask: "Which weekdays have revenue at least 20% above the
average weekday?" Its advice can tell the owner to prepare more stock and staff.

### Findings and recommendations

A finding is the immediate result produced by the rule engine. A recommendation is
the stored version of that finding.

Each recommendation separates two ideas:

- **Body:** what the data shows.
- **Action:** what the owner should do about it.

This matters because describing a pattern is not the same as giving useful business
advice. The body is derived from the measured data, while the action comes from the
rule's advice.

### Published insights

A published insight is a deliberately limited public copy of a recommendation. It
contains the public display name and caption entered by the owner, plus trusted
details copied by the server from the recommendation and its data set.

Publishing does not make the original recommendation public and does not expose the
complete sales data set.

## 3. How the rule engine works

The rule engine is a pure business-logic module. It receives sales rows and a rule,
then returns findings. It does not read the database, handle a web request, or update
the interface. Keeping calculation separate from infrastructure makes the business
rules easier to reason about and test.

### Choosing the measured value

For every sales row, the engine converts the chosen metric into a value:

- revenue uses the row's revenue;
- quantity uses the row's quantity; and
- orders counts each sales row as one order unit for the Phase 1 data contract.

### Grouping the data

The chosen dimension determines how values are grouped:

- `dayOfWeek` groups rows into Sunday through Saturday;
- `item` groups rows by item name; and
- `category` groups rows by category, using "Uncategorised" when needed.

The values inside each group are added together. The engine also remembers the most
recent sale date in each group so it can evaluate inactivity rules.

### Above-average and below-average rules

The engine calculates the average value across all available groups. It then measures
how far each group is above or below that average as a percentage.

A group becomes a finding when its percentage meets the rule threshold:

- `above_average_by` matches positive differences at or above the threshold;
- `below_average_by` matches negative differences whose size is at or above the
  threshold.

Positive matches are presented as opportunities and negative matches as warnings.

### Unsold-for-days rules

An inactivity rule compares a group's latest sale date with the latest date anywhere
in the data set. It creates a warning when the gap reaches the configured number of
days.

This rule applies only to items and categories. It can find something that sold in
the past and then stopped selling. It cannot identify an item that has never appeared
in any sales row because there is no source record from which to discover that item.

### Conditions that intentionally produce no findings

The engine returns no findings when:

- the rule is disabled;
- the data set has no sales rows;
- the requested dimension is `hour`; or
- the metric and dimension produce no usable groups.

Hour rules are part of the shared contract, but Phase 1 sales rows contain a calendar
date and no hour or timestamp. Evaluating hour patterns would therefore require
inventing data, so the engine correctly declines to do it.

## 4. How recommendations are generated and stored

The recommendations endpoint is private and requires a valid owner session. It:

1. finds the most recently created data set;
2. loads that data set's sales rows;
3. loads the saved rules;
4. evaluates the rules;
5. stores new findings or updates matching existing recommendations; and
6. returns all stored recommendations for that data set.

If there is no data set, or the latest data set has no sales rows, the endpoint returns
a real not-found error with a useful explanation.

### First-run starter rules

When the database contains no saved rules, the engine uses three built-in starter
rules for busy days, quiet days, and low-selling items. This makes the first-run
experience useful before the owner has configured anything.

As soon as at least one rule is saved, only saved rules are evaluated. This gives the
owner full control and prevents hidden starter behaviour from being mixed with their
custom rule set.

### Stable recommendation identity

A recommendation must keep the same database identity across page refreshes.
Otherwise, a published insight would point to yesterday's temporary identity while
the refreshed recommendation card received a new one and appeared unpublished.

To prevent that, a finding is matched using its data set, source rule, title, metric,
and dimension. The database updates the existing recommendation when that match
already exists and creates it only when necessary.

This is an **upsert**: update if found, insert if missing. Stable identity is the key
that makes publish status survive refreshes.

### Why old recommendations are retained

Deleting or disabling a rule stops future evaluation, but recommendations already
created by it remain stored and visible. This preserves the history of what the
engine found. More importantly, it prevents a published insight from losing its
private unpublish control merely because its source rule was removed.

## 5. Rule management

The rule builder supports the full record lifecycle:

| Owner action | Result |
| --- | --- |
| View rules | Saved rules are returned in name order. |
| Add a rule | A new server-generated identity is assigned and the rule is stored. |
| Edit a rule | The existing record is updated and returned. |
| Disable a rule | The record remains, but the engine skips it. |
| Delete a rule | Only the rule is removed; earlier recommendations remain. |

Deletion has a confirmation step because it is the only rule action that removes a
record. The dialog explains that past recommendations stay while future evaluation
stops.

### Create contracts versus stored-record contracts

The rule form uses `ruleCreateSchema`, not the complete stored `ruleSchema`.

This reflects an important trust boundary:

- the owner supplies the editable business fields;
- the server assigns the database identity; and
- the completed record is validated before it is returned.

A browser should not generate database identities. Binding a creation form to the
complete record contract would also require an identity field that does not exist in
the form, causing apparently silent submission failures.

### Validation happens twice

The shared schema is used both by the form and by the server endpoint.

- Browser validation gives quick, field-level feedback.
- Server validation protects the database even if someone bypasses the interface or
  sends a request manually.

The server remains the final authority. Invalid record identities return a bad-request
error, and valid identities that do not exist return a not-found error.

## 6. The recommendations interface

The private recommendations page declares two initial data needs:

- the recommendations for the latest data set; and
- the owner's currently published insights.

It builds a lookup from recommendation identity to published insight. Each card can
therefore show one of two states:

- **Private:** the owner sees the Share action.
- **Published:** the owner sees a Published label, a public-page link, and Unpublish.

This state is based on stored server data, not browser memory. Reloading the page,
opening it in another browser, or signing in later produces the same result.

The page also handles loading, empty, retry, and server-error states. Publishing and
unpublishing track the active recommendation separately, so the correct card shows
progress and errors.

## 7. Publishing a recommendation

Publishing is a boundary between private and public data, so the workflow asks for
explicit confirmation and shows a preview of what strangers will see.

The owner supplies only:

- the public display name;
- a caption;
- whether absolute numbers should be hidden; and
- the recommendation being published.

The privacy option defaults to hiding absolute numbers. A safer default matters
because changing it requires a deliberate decision by the owner.

### What the server supplies

The browser is not trusted to supply public metrics or business metadata. The server
loads the referenced recommendation and data set, then derives:

- the published record identity;
- the unique public URL slug;
- the metric label;
- the metric value;
- the business type;
- the source recommendation identity;
- the source data-set identity; and
- the publication timestamp.

This prevents a browser from publishing a metric that does not match the selected
recommendation or claiming a different business type.

The Phase 1 published metric value is the recommendation's percentage change. The
`hideAbsoluteNumbers` choice is stored so the public renderer can enforce the owner's
privacy preference. The current published record does not itself contain an absolute
revenue or quantity figure.

### Unique public slugs

The public URL combines the owner's public display name with the recommendation
title, then normalises them into a readable URL-safe value.

The readable value is attempted without a suffix first. If MongoDB's unique slug
index reports a collision, the server retries with `-2`, `-3`, and so on. Letting the
database report collisions avoids a race between checking a slug and inserting it.

### Idempotent publishing

Publishing is idempotent: repeating the same request for the same recommendation
returns the existing published insight instead of creating another public page.

This protects against common real-world events such as a slow connection, a lost
response, or a user retrying after the server already completed the first request.

### Persistent links to source records

The published insight stores both `recommendationId` and `datasetId`.

- `recommendationId` lets the private page recover publish status and lets unpublish
  locate the correct public record.
- `datasetId` lets data-set deletion remove every public insight derived from that
  data set even if the intermediate recommendation has already been deleted.

These links are required during publishing but nullable in stored historical records.
That allows a public record to remain structurally valid if its source finding is
removed under a future retention policy.

## 8. Unpublishing

Unpublishing deletes the public insight by its source recommendation identity. It does
not delete the recommendation, rule, data set, or sales rows.

The interface warns the owner that:

- the insight disappears from the public feed;
- its public URL stops working; and
- the private recommendation and source data remain unchanged.

After a successful response, the recommendation card immediately returns to its
private Share state. A later page load confirms the same state from the database.

If no published record matches the recommendation, the server returns a not-found
error instead of pretending that a deletion occurred.

## 9. Authentication and trust boundaries

Every M4 recommendation, rule, and publish endpoint requires the owner's session.
Client-side route protection improves navigation, but it is not treated as security.
The server checks authentication independently on every private operation.

The overall boundary is:

| Layer | Responsibility |
| --- | --- |
| Browser form | Collect intended owner input and show immediate feedback. |
| Shared schema | Define the same accepted data contract for browser and server. |
| Private endpoint | Verify the session, validate input, and enforce business rules. |
| Database | Persist identities and relationships and enforce storage guarantees. |
| Public insight endpoint | Return only the intentionally published record. |

## 10. Error handling

Expected failures use meaningful HTTP categories:

- **400:** the submitted data or record identity is invalid;
- **401:** the owner must sign in;
- **403:** the account is not allowed to perform the action;
- **404:** a requested data set, recommendation, rule, or published insight does not
  exist; and
- **500:** the server could not complete an otherwise valid operation.

Forms and cards display server messages close to the action that failed. Loading and
retry states stop temporary network problems from looking like empty business data.

The application-level error page also explains common failures in plain language. A
missing public insight specifically acknowledges that the link may be old or that the
owner may have unpublished it. Unexpected errors reassure the user that viewing an
error page did not itself change uploaded data.

## 11. Important design decisions

### The database is the source of truth

Publish status, recommendations, and rules are not remembered only in component
state. Component state makes the interface responsive, but refreshes always recover
the authoritative state from the server.

### Derived data is created on the server

The browser identifies the recommendation and supplies only owner-authored public
fields. Business type, metric information, URL identity, and timestamps come from
trusted server records.

### Existing work is preserved

Deleting a rule does not erase findings it created. Unpublishing does not erase the
private analysis. These boundaries reduce accidental data loss and keep each action's
effect understandable.

### Loading, empty, and error are different states

A page waiting for data is not empty. A failed request is not an empty result. The
interface treats these conditions separately so the owner is not misled.

### Destructive actions require confirmation

Deleting a rule and unpublishing an insight both explain their exact impact before
the operation proceeds.

## 12. End-to-end example

Consider a data set in which Friday revenue is substantially higher than the average
weekday.

1. The owner opens Recommendations.
2. The server loads the latest data set, its rows, and the active rules.
3. The busy-day rule groups revenue by weekday.
4. Friday crosses the configured threshold.
5. A finding describes Friday as above average and attaches the rule's staffing and
   stock advice.
6. The finding is stored as a recommendation with a stable identity.
7. The owner opens Share, enters a public business name and caption, reviews the
   privacy option, and confirms.
8. The server validates the request, reloads the recommendation and data set, creates
   the trusted public record, and returns its unique URL.
9. The recommendation card now shows Published, even after a refresh.
10. If the owner unpublishes it, the public record disappears while the private
    recommendation remains.

## 13. Files and responsibilities

| Area | Responsibility |
| --- | --- |
| `server/utils/rules.ts` | Pure evaluation of sales rows against rules. |
| `server/api/recommendations/index.get.ts` | Load real data, generate findings, preserve stable recommendations, and return them. |
| `server/api/recommendations/rules*` | List, create, update, and delete rules. |
| `server/api/publish/index.get.ts` | Return persistent publish status for the owner. |
| `server/api/publish/index.post.ts` | Validate and create an idempotent public insight. |
| `server/api/publish/[recommendationId].delete.ts` | Unpublish the insight linked to a recommendation. |
| `app/pages/recommendations/index.vue` | Coordinate recommendation and publish state. |
| `app/pages/recommendations/rules.vue` | Coordinate rule viewing and management. |
| `app/components/recommendations/RuleForm.vue` | Collect and validate rule input for both creation and editing. |
| `app/components/recommendations/RecommendationCard.vue` | Present the finding, action, severity, and publication controls. |
| `app/components/recommendations/ShareButton.vue` | Explain public visibility, collect publish input, and preview the public result. |
| `app/error.vue` | Present authentication, permission, missing-page, and unexpected errors clearly. |

## 14. Current Phase 1 limitations

- Hour analysis is unavailable until sales data includes time information.
- Order measurement treats each sales row as one order unit under the current data
  contract; a future transaction identifier would permit true distinct-order counts.
- Unsold rules cannot discover catalogue items that never occur in the sales data.
- Comparison rules compare each group's total with the average group total; they do
  not normalise groups for unequal coverage periods.
- Published records currently carry the percentage change, not an absolute sales
  amount. The privacy preference is nevertheless stored for the public renderer and
  future compatible data contracts.

These are explicit boundaries, not silent guesses. Extending them requires changes to
the shared data contract and coordination with M1 and the affected feature owner.

## 15. Verification completed

The implementation passed the project's TypeScript type check and production build.
The publishing lifecycle was also exercised end to end against the shared database:

1. authenticate;
2. generate recommendations with stable identities;
3. publish a recommendation;
4. confirm its published state survives refresh;
5. open the public record;
6. unpublish it; and
7. confirm the old public link returns not found.

Temporary published test data from that verification was removed afterward. A final
interactive create/edit/delete pass for the rule builder should still be performed
before the Phase 1 demonstration.
