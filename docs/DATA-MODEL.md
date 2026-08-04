# InsightFlow data model

MongoDB has no schema of its own, so the real contract is `shared/schemas/`. This
document describes what those schemas mean, what links to what, and what is
deliberately missing.

The diagram below is Mermaid. It is text, so an AI assistant can read it, and it
renders as a diagram on GitHub and in most editors.

```mermaid
erDiagram
    DATASETS ||--o{ SALESROWS : "contains"
    DATASETS ||--o{ RECOMMENDATIONS : "produced"
    RULES ||--o{ RECOMMENDATIONS : "triggered (optional)"
    USERS {
        ObjectId _id PK
        string username
        string displayName
        string createdAt "ISO timestamp"
    }
    DATASETS {
        ObjectId _id PK
        string name "min 3 chars"
        string businessType "restaurant|retail|gym"
        string periodStart "YYYY-MM-DD"
        string periodEnd "YYYY-MM-DD"
        number rowCount "whole, >= 0"
        string currentVersionId "nullable, unused"
        string notes "optional, max 500"
        string createdAt
        string updatedAt
    }
    SALESROWS {
        ObjectId _id PK
        string datasetId FK "24-hex string"
        string date "YYYY-MM-DD"
        string itemName
        string category "optional"
        number quantity "whole, > 0"
        number unitPrice "> 0"
        number revenue "= quantity * unitPrice"
    }
    RULES {
        ObjectId _id PK
        string name
        string metric "revenue|quantity|orders"
        string dimension "dayOfWeek|item|category|hour"
        string operator "above_average_by|below_average_by|unsold_for_days"
        number threshold "> 0"
        string advice "min 10 chars"
        boolean enabled
    }
    RECOMMENDATIONS {
        ObjectId _id PK
        string datasetId FK
        string ruleId FK "nullable"
        string title
        string body
        string metric
        string dimension
        number changePercent "may be negative"
        string severity "info|opportunity|warning"
        string createdAt
    }
    PUBLISHEDINSIGHTS {
        ObjectId _id PK
        string slug UK "lowercase-hyphens, unique"
        string displayName "2-40 chars"
        string caption "10-280 chars"
        string metricLabel
        number metricValue
        boolean hideAbsoluteNumbers "default true"
        string businessType
        string publishedAt
    }
```

## How ids work

Every document keeps Mongo's own `_id`, which is an `ObjectId`. The shared schemas
call the same thing `id` and type it as a **24-character hexadecimal string**.

The conversion happens at the edge of the server: a route reads `_id` from the
database and returns `id` as a hex string. Foreign keys such as `datasetId` are
**stored as strings, not ObjectIds**, so a stored document can be handed straight to
a schema without converting anything first.

**Ids are created by the server, never by the browser.** A form that generates its
own id cannot satisfy `idSchema` and will fail silently, because there is no field
on screen for the error to appear in.

## The relationships, in words

- **A data set has many sales rows.** `salesRows.datasetId` points at
  `datasets._id`. This is the only high-volume relationship — one data set holds
  hundreds or thousands of rows. Deleting a data set must delete its rows.
- **A data set has many recommendations.** `recommendations.datasetId` points at
  `datasets._id`. Findings belong to the period they were found in, so deleting a
  data set must delete its recommendations too, or they dangle.
- **A rule may produce many recommendations.** `recommendations.ruleId` points at
  `rules._id` and **is nullable**: a finding that did not come from a saved rule
  stores `null`. Rules are configuration and outlive any single data set, which is
  why `npm run seed` deliberately leaves the `rules` collection alone.
- **Published insights stand alone.** They carry no foreign key at all — see the
  gaps below.
- **Users are not referenced by anything.** Sign-in compares against environment
  variables, not this collection, so the record is a profile rather than an account.

## Indexes

Created by `server/utils/indexes.ts`, once per process, and safe to run repeatedly.

| Collection | Index | Why |
| --- | --- | --- |
| `salesRows` | `{ datasetId: 1, date: 1 }` | Every analytics query reads one data set in date order |
| `publishedInsights` | `{ slug: 1 }` **unique** | Two businesses must never claim the same public URL |
| `publishedInsights` | `{ publishedAt: -1 }` | The public feed lists newest first |

Uniqueness of `slug` is enforced **here, not in Zod**. Zod validates one value at a
time and cannot know what else exists in the collection.

## Record shapes and form shapes are different

`datasetSchema` describes a row that is already stored: it includes the `id`, the
timestamps and `rowCount`, all of which the server fills in.
`datasetCreateSchema` describes only the five fields an owner types.

**Forms bind to the create schema.** A form bound to the record schema cannot
submit. If the create schema you need does not exist, ask M1 to add it.

## Gaps you should know about

These are real and deliberate, not oversights to route around quietly.

1. **`datasets.currentVersionId` points at nothing.** There is no versions
   collection. The field exists because the contract anticipated data set
   versioning; today it is always `null`. Do not build against it without asking M1.
2. **A published insight cannot be traced back to its source.** There is no
   `recommendationId` or `datasetId` on `publishedInsights`. That means you cannot
   currently answer "which finding did this public page come from", and deleting a
   data set cannot automatically unpublish what came from it — even though the
   delete confirmation promises exactly that. **M4 and M1 need to settle this before
   publishing ships.**
3. **There is no owner on anything.** No `userId` on `datasets` or anywhere else.
   The product is single-tenant: one account, one set of data. Adding a second
   business later means adding an owner reference to almost every collection.
4. **Nothing enforces referential integrity.** MongoDB will not stop you deleting a
   data set and leaving its sales rows behind. Cascading deletes are the
   application's job, in the route that handles the delete.
5. **`recommendations` has no field for the suggested action.** The scaffolded UI
   shows a plain-language action sentence per finding, and the schema has `title`
   and `body` but nothing for the action. M4 needs this added before wiring.

## Seeded data

`npm run seed` fills these collections with one demo restaurant: 1 user, 1 data
set, ~630 sales rows across 8 weeks, and 3 published insights. `recommendations`
and `rules` are left empty for M4 to fill. Ids change on every reseed, so never
hardcode one.
