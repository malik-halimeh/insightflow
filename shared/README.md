# shared/

The validation contract for InsightFlow. Everything the client and the server both
need to agree on lives here.

## One owner

**M1 (lead) owns this folder.** M2, M3, M4 and M5 all import from it, which means a
change here can break four people's work at once.

**Do not edit these files directly. Request the change from M1.** If a schema is
missing a field you need, or a rule is wrong, say so and it will be changed once,
here, for everybody.

## How to use it

Import from the folder root, using the `#shared` alias. It resolves from both pages
and server routes, so the same import line works on either side:

```ts
import { datasetSchema, type Dataset } from '#shared/schemas'
```

Every schema exports two things: the Zod object and the inferred TypeScript type.
The same schema is imported by the page form and by the server route that receives
it, so a rule is written once and enforced on both sides.

## What belongs here

- Zod schemas and the types inferred from them.
- Shared primitives in `common.ts` — record ids, dates, timestamps.

## What does not belong here

- Database code. No collections, no queries, no driver imports.
- Business logic. Analysis, scoring and rule evaluation live in `server/`.
- Anything only one feature needs. Keep it in that feature's folder.

## Conventions

- Money and quantities are numbers. Dates are ISO strings.
- `isoDateSchema` is a calendar day (`2026-03-15`) for business dates that come from
  a spreadsheet. `isoDateTimeSchema` is a full timestamp for record keeping.
- Validation messages are written for a small business owner, not a developer. They
  say what to do next, and they never mention types, fields or code.
