# InsightFlow design system

You do not need to make any visual decisions. Everything is decided. Look it up here,
copy the markup, change the words.

If something you need is not in this document, ask M1. Do not invent it.

---

## 1. Type

Use the exact class strings below. Do not mix your own sizes or weights.

| What you are writing | Class | How often |
| --- | --- | --- |
| Landing hero | `text-3xl font-semibold tracking-tight` | Only on `/`. Never again. |
| Page title | `text-2xl font-semibold tracking-tight` | Once per page. Use `<UiPageHeader>`, which does it for you. |
| Card title | `text-lg font-semibold` | Inside a `UCard` header |
| Section title | `text-base font-semibold` | Above a table or a group of cards |
| Body text | `text-sm` | Everything in the signed-in workspace |
| Lede | `text-lg text-muted` | The one intro line on a public page |
| Label / caption | `text-xs text-muted` | Timestamps, units, table hints |
| Big number | `text-2xl font-semibold` | Use `<UiMetricCard>`, which does it for you |

**Weight:** only `font-semibold`. Never `font-bold`, never `font-medium` by hand.

**`tracking-tight`:** only at `text-2xl` and above. Never below.

There is no web font. The system font is deliberate — it loads instantly on an old
phone and looks native to the owner reading it.

---

## 2. Spacing

Reach for exactly three values. Everything else is already handled by the layout.

| Value | Use it for |
| --- | --- |
| `gap-2` | Inside one component — an icon next to its label, a button next to a button |
| `gap-4` | Between separate elements — cards in a grid, fields in a form |
| `gap-8` | Between sections of a page |

**Do not set page padding.** The layout already applies it. Never write `p-6` or
`px-8` on a page root.

Vertical rhythm uses the same numbers: `mt-2`, `mt-4`, `mt-8`.

---

## 3. Colour

Never write a Tailwind colour name. There is no `text-gray-500`, no `bg-blue-600`.
Only the words in this table.

| Token | Meaning | Where you use it |
| --- | --- | --- |
| `primary` | An action | Buttons, links, focus rings |
| `neutral` | Structure | Secondary buttons, badges with no meaning |
| `success` | **A number went up** | Handled by `<UiChangeIndicator>` |
| `error` | **A number went down**, or something failed | Change indicators, error alerts |
| `warning` | Needs the owner's attention | `severity: warning` |
| `info` | Background information | `severity: info` |

**Text and surfaces:** `text-default`, `text-muted`, `border-default`, `bg-elevated`.
That is the whole list.

### Up, down and neutral

This is the rule that matters most in this product.

| The change | Colour | Icon | Example |
| --- | --- | --- | --- |
| Greater than `+0.05%` | `success` (green) | arrow up-right | `+32.7%` |
| Less than `-0.05%` | `error` (red) | arrow down-right | `-18.5%` |
| Between the two | `neutral` (grey) | dash | `0.0%` |

**You never implement this yourself.** Use `<UiChangeIndicator :value="32.7" />`.

Green means up because every figure in phase 1 — revenue, quantity, orders — is one
where more is better. If a metric ever arrives where up is bad, stop and ask M1.
Do not invert the colours yourself.

**Colour is never the only signal.** The arrow and the `+`/`-` sign say the same
thing, so the figure still reads in greyscale and to a colourblind owner. Do not
remove them.

### Recommendation severity

| `severity` | Component |
| --- | --- |
| `opportunity` | `<UBadge color="success">Opportunity</UBadge>` |
| `warning` | `<UBadge color="warning">Warning</UBadge>` |
| `info` | `<UBadge color="info">Info</UBadge>` |

---

## 4. Dark mode

The app supports dark mode and you do not have to do anything for it — **as long as
you only use the tokens in section 3**. The moment you write `bg-white` or
`text-gray-700`, that element breaks in dark mode. This is the single most common way
to break the design.

---

## 5. Shape

- **Corners:** never write a rounded class. Components already have the right radius.
- **Borders:** 1px, always. `border border-default`. Never `border-2`.

---

## 6. Numbers

Import the formatters. Never format a number by hand, never use `.toFixed()` in a
template.

```ts
import { formatMoney, formatCount, formatPercentChange } from '#shared/format'
```

| Kind | Function | Output |
| --- | --- | --- |
| Money | `formatMoney(59555.5)` | `£59,555.50` — always two decimals |
| Counts | `formatCount(2477)` | `2,477` — never decimals |
| Change | `formatPercentChange(32.7)` | `+32.7%` — always signed, always one decimal |

Figures line up in columns automatically. You do not need to add `tabular-nums`.

---

## 7. The five patterns

Copy these. Change the words, not the classes.

### Page header

```vue
<UiPageHeader title="Data sets" description="Every spreadsheet you have uploaded.">
  <template #actions>
    <UButton>Upload data</UButton>
  </template>
</UiPageHeader>
```

`description` and `#actions` are both optional. Drop them if you have nothing to say.

### Data table

```vue
<script setup lang="ts">
import { formatCount, formatMoney } from '#shared/format'

const columns = [
  { accessorKey: 'itemName', header: 'Item' },
  { accessorKey: 'quantity', header: 'Sold' },
  { accessorKey: 'revenue', header: 'Revenue' }
]
</script>

<template>
  <UTable :data="rows" :columns="columns">
    <template #quantity-cell="{ row }">
      {{ formatCount(row.original.quantity) }}
    </template>
    <template #revenue-cell="{ row }">
      {{ formatMoney(row.original.revenue) }}
    </template>
  </UTable>
</template>
```

Always format money and counts through the cell slots. A raw number in a table is a bug.

### Metric card

```vue
<div class="grid gap-4 sm:grid-cols-3">
  <UiMetricCard
    label="Revenue"
    :value="formatMoney(59555.5)"
    :change="32.7"
    change-label="against the weekly average"
  />
</div>
```

`value` is already-formatted text — you format it, the card displays it. Leave out
`change` when there is nothing to compare against.

### Form

```vue
<script setup lang="ts">
import { datasetCreateSchema, type DatasetCreate } from '#shared/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'

const state = reactive<DatasetCreate>({ name: '' })
const serverError = ref<string | null>(null)

async function onSubmit(event: FormSubmitEvent<DatasetCreate>) {
  serverError.value = null
  try {
    await $fetch('/api/datasets', { method: 'POST', body: event.data })
    await navigateTo('/datasets')
  } catch (error) {
    serverError.value = (error as { statusMessage?: string }).statusMessage
      ?? 'We could not save this. Please try again.'
  }
}
</script>

<template>
  <UForm :schema="datasetCreateSchema" :state="state" class="space-y-4" @submit="onSubmit">
    <UAlert v-if="serverError" color="error" variant="subtle" :description="serverError" />

    <UFormField label="Name" name="name">
      <UInput v-model="state.name" class="w-full" />
    </UFormField>

    <UButton type="submit">Save data set</UButton>
  </UForm>
</template>
```

**Bind the form to the `…CreateSchema`, never to the record schema.** `datasetSchema`
describes a row already stored in the database — it includes `id`, `createdAt` and
`rowCount`, which the server assigns. A form bound to it can never submit, because
those fields are empty and have no input to show the error in.

| You are building | Use |
| --- | --- |
| A create form | `datasetCreateSchema` |
| Reading a stored record | `datasetSchema` |

If the create schema you need does not exist, **ask M1 to add it**. Do not build the
form against the record schema, and do not generate an `id` in the browser.

The schema comes from `#shared/schemas` and nowhere else. Never write a validation
rule in a page — the error messages are already written for the owner. Always show
`serverError`: a form that fails silently is the worst possible outcome.

### Empty state

```vue
<UiEmptyState
  title="No data sets yet"
  description="Upload a spreadsheet of your sales and InsightFlow will find the patterns."
>
  <template #action>
    <UButton>Upload data</UButton>
  </template>
</UiEmptyState>
```

An empty screen tells the owner what to do next. It never apologises and never just
says "No results".

---

## 8. Buttons

| Situation | Markup |
| --- | --- |
| The main action on the page | `<UButton>Save</UButton>` |
| A secondary action | `<UButton color="neutral" variant="subtle">Cancel</UButton>` |
| A destructive action | `<UButton color="error">Delete</UButton>` |

Never set `size`. The default is correct everywhere. The two exceptions already in the
codebase — the landing page and the sidebar — are done and are not a precedent.

---

## 9. Writing

- Sentence case for everything. Not Title Case.
- A button says what happens: `Save changes`, not `Submit`.
- The same action keeps the same name everywhere. `Publish` produces "Published".
- Errors say what went wrong and what to do. They do not apologise.
- Say "data set", not "dataset", in anything an owner reads.

---

## 10. Landing page hero glow

`/` and the brand panel on `/login` use one soft radial glow behind the hero copy.
It is the single sanctioned arbitrary-value exception in this document — copy the
class exactly, do not tweak the numbers or add a second one elsewhere.

```html
<div
  class="pointer-events-none absolute inset-x-0 -top-24 h-[420px] bg-[radial-gradient(ellipse_at_top,_var(--ui-primary)_0%,_transparent_60%)] opacity-[0.08]"
/>
```

It sits inside a `relative overflow-hidden` section, behind `relative` content, and
uses the `primary` CSS variable rather than a hex value so it still makes sense in
dark mode. `opacity-[0.10]` (not `0.08`) is used once, on the darker `bg-elevated`
brand panel on `/login`, where the lighter value all but disappears.

## 11. Marketing sections outside the workspace

`/` is the one page allowed to break from the single-column, `max-w-4xl` shape
every other page uses (see `app/layouts/landing.vue`). A few extra patterns exist
only there:

- **Full-bleed bands.** A `<section>` can span the full window width with its own
  `border-t`/`border-b border-default` and a `bg-elevated/50` tint to separate it
  from its neighbours. The content inside still sits in a centred
  `mx-auto w-full max-w-6xl px-4` row — only the band's background runs edge to edge.
- **`max-w-6xl`, not `max-w-4xl`.** The wider row is landing-page only. Every other
  page keeps `max-w-4xl`.
- **Illustrative preview data.** The hero's dashboard preview reuses real
  components (`UiMetricCard`, `UiChangeIndicator`) with invented example numbers,
  labelled `Example` with a neutral `UBadge`. Never present made-up numbers as if
  they were real usage, growth or customer statistics — say what the product does,
  not a number nobody can verify.
- **`UAccordion` for FAQs.** The only page that uses it. `items` take `label` and
  `content`, matching the pattern already in the codebase.

---

## 12. Do not

- **No custom CSS files.** No `<style>` blocks. If you think you need one, you need M1.
- **No arbitrary Tailwind values.** No `w-[347px]`, no `text-[13px]`, no `mt-[7px]`.
  The one sanctioned exception is the hero glow in section 10 — copy it exactly,
  do not invent a second one.
- **No new colours.** Only the tokens in section 3.
- **No extra icon libraries.** Lucide only, `i-lucide-*`. It is already installed.
- **No new fonts.**
- **No overriding Nuxt UI components with your own classes** to change how they look.
  Change `app/app.config.ts` instead — and that file is M1's.
- **No formatting numbers by hand.** Use `#shared/format`.
- **No editing another module's folder.** See the ownership table in `/CLAUDE.md`.
