<!--
  OWNER: M2 (data sets)

  WHAT THIS IS
  A finished layout for adding a data set. Nothing here talks to a server. The
  four states are all built and styled — use the dashed "Preview state" box to
  look at each one.

  THE STATE THAT MATTERS
  "Partial" is the important one. A shop owner exports 200 rows from their till and
  6 of them are malformed. Throwing the whole file away for 6 bad lines is the
  wrong answer, and so is importing silently and losing them. So the page leads
  with what worked, then lists exactly what did not and why, line by line.

  WHAT TO REPLACE
  1. `DEMO_PROBLEMS` and `DEMO_TOTALS` — real numbers from your upload endpoint.
  2. `demoState` and the dashed box — delete both. Drive the states from the real
     request instead.
  3. `onCheckFile` and `onImport` — call your endpoints. Use `$fetch` inside these
     functions, never `useFetch`.

  WHAT NOT TO CHANGE
  - The order on the partial screen: what worked comes first, always.
  - The error wording. "Line 47: quantity must be a whole number" tells an owner
    where to look and what to fix. "Validation failed" does not.
  - The class names. They come from docs/DESIGN-SYSTEM.md.

  BEFORE YOU WIRE IT
  The form binds to `datasetCreateSchema`. The sales rows are separate — ask M1 for
  the upload schema, do not invent one here.
-->

<script setup lang="ts">
import { datasetCreateSchema, type DatasetCreate } from '#shared/schemas'
import { formatCount } from '#shared/format'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Add a data set — InsightFlow' })

const DEMO_STATES = [
  { label: 'Form (no file yet)', value: 'form' },
  { label: 'Checking file', value: 'checking' },
  { label: 'Partial success', value: 'partial' },
  { label: 'All rows valid', value: 'clean' }
]
const demoState = ref<'form' | 'checking' | 'partial' | 'clean'>('form')

const BUSINESS_TYPES = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Shop', value: 'retail' },
  { label: 'Gym', value: 'gym' }
]

const state = reactive<DatasetCreate>({
  name: '',
  businessType: 'restaurant',
  periodStart: '2026-06-05',
  periodEnd: '2026-07-30',
  notes: undefined
})

/** Local to this scaffold. Ask M1 for the real shape before wiring the upload. */
interface RowProblem {
  line: number
  column: string
  value: string
  message: string
}

const DEMO_TOTALS = { total: 200, valid: 194, invalid: 6 }

const DEMO_PROBLEMS: RowProblem[] = [
  { line: 47, column: 'quantity', value: '2.5', message: 'Quantity must be a whole number.' },
  { line: 61, column: 'unitPrice', value: '-4.00', message: 'The price per item must be more than zero.' },
  { line: 88, column: 'date', value: '31/06/2026', message: 'Use the form YYYY-MM-DD, for example 2026-06-30.' },
  { line: 92, column: 'itemName', value: '', message: 'Please enter the name of the item sold.' },
  { line: 140, column: 'revenue', value: '18.00', message: 'The total does not match the quantity multiplied by the price.' },
  { line: 177, column: 'quantity', value: '0', message: 'The quantity sold must be more than zero.' }
]

const problemColumns = [
  { accessorKey: 'line', header: 'Line' },
  { accessorKey: 'column', header: 'Column' },
  { accessorKey: 'value', header: 'What the file says' },
  { accessorKey: 'message', header: 'What is wrong' }
]

function onCheckFile() {
  // M2: upload the file for checking, then set the state from the response.
  demoState.value = 'checking'
}

function onImport() {
  // M2: import the valid rows, then send the owner to the data set.
}
</script>

<template>
  <div class="max-w-3xl">
    <!-- Scaffolding: delete this box and `demoState` when you wire real data. -->
    <div class="mb-8 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-default p-3">
      <span class="text-xs text-muted">Preview state</span>
      <USelect v-model="demoState" :items="DEMO_STATES" size="xs" class="w-48" />
    </div>

    <UiPageHeader
      title="Add a data set"
      description="Tell us what this period covers, then add the sales rows."
    />

    <!-- Form: the starting state, before a file is chosen -->
    <UForm
      v-if="demoState === 'form'"
      :schema="datasetCreateSchema"
      :state="state"
      class="space-y-8"
    >
      <div class="space-y-4">
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" placeholder="Spring sales" class="w-full" />
        </UFormField>

        <UFormField label="Business type" name="businessType">
          <USelect v-model="state.businessType" :items="BUSINESS_TYPES" class="w-full" />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="First day" name="periodStart">
            <UInput v-model="state.periodStart" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Last day" name="periodEnd">
            <UInput v-model="state.periodEnd" type="date" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Notes" name="notes" hint="Optional">
          <UTextarea
            v-model="state.notes"
            :rows="3"
            placeholder="Anything worth remembering about this period."
            class="w-full"
          />
        </UFormField>
      </div>

      <USeparator />

      <div class="space-y-4">
        <div>
          <h2 class="text-base font-semibold">
            Sales data
          </h2>
          <p class="mt-1 text-sm text-muted">
            A CSV exported from your till. One row per item sold, with the date,
            item name, quantity and price.
          </p>
        </div>

        <UFormField label="CSV file" name="file">
          <UInput type="file" accept=".csv,text/csv" class="w-full" />
        </UFormField>

        <div class="flex flex-wrap gap-2">
          <UButton icon="i-lucide-upload" @click="onCheckFile">
            Check the file
          </UButton>
          <UButton to="/datasets" color="neutral" variant="subtle">
            Cancel
          </UButton>
        </div>
      </div>
    </UForm>

    <!-- Loading: the file is being read -->
    <div v-else-if="demoState === 'checking'" class="space-y-4">
      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-loader-circle" class="size-5 shrink-0 animate-spin text-muted" />
          <div>
            <p class="font-medium">
              Reading your file
            </p>
            <p class="text-sm text-muted">
              Checking each row. This usually takes a few seconds.
            </p>
          </div>
        </div>
      </UCard>
      <USkeleton class="h-10 w-full" />
      <USkeleton class="h-10 w-full" />
    </div>

    <!-- Every row was fine -->
    <div v-else-if="demoState === 'clean'" class="space-y-6">
      <UAlert
        color="success"
        variant="subtle"
        icon="i-lucide-check"
        :title="`All ${formatCount(DEMO_TOTALS.total)} rows are ready`"
        description="Nothing needs fixing. Import them and InsightFlow will start looking for patterns."
      />
      <div class="flex flex-wrap gap-2">
        <UButton icon="i-lucide-check" @click="onImport">
          Import {{ formatCount(DEMO_TOTALS.total) }} rows
        </UButton>
        <UButton color="neutral" variant="subtle" @click="demoState = 'form'">
          Choose a different file
        </UButton>
      </div>
    </div>

    <!-- Partial success. What worked comes first. -->
    <div v-else class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-3">
        <UCard class="sm:col-span-2">
          <p class="text-xs text-muted">
            Ready to import
          </p>
          <p class="mt-1 text-2xl font-semibold text-success">
            {{ formatCount(DEMO_TOTALS.valid) }} of {{ formatCount(DEMO_TOTALS.total) }} rows
          </p>
          <p class="mt-2 text-sm text-muted">
            You can import these now and fix the rest later. Nothing is lost by
            importing what already works.
          </p>
        </UCard>

        <UCard>
          <p class="text-xs text-muted">
            Need attention
          </p>
          <p class="mt-1 text-2xl font-semibold text-warning">
            {{ formatCount(DEMO_TOTALS.invalid) }} rows
          </p>
          <p class="mt-2 text-sm text-muted">
            Listed below with the line number.
          </p>
        </UCard>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton icon="i-lucide-check" @click="onImport">
          Import {{ formatCount(DEMO_TOTALS.valid) }} rows
        </UButton>
        <UButton color="neutral" variant="subtle" icon="i-lucide-rotate-ccw" @click="demoState = 'form'">
          Fix the file and try again
        </UButton>
      </div>

      <USeparator />

      <div class="space-y-3">
        <div>
          <h2 class="text-base font-semibold">
            The {{ formatCount(DEMO_TOTALS.invalid) }} rows that need fixing
          </h2>
          <p class="mt-1 text-sm text-muted">
            Open your CSV and go to these line numbers. Everything else imports fine.
          </p>
        </div>

        <UTable :data="DEMO_PROBLEMS" :columns="problemColumns">
          <template #line-cell="{ row }">
            <span class="font-medium">Line {{ row.original.line }}</span>
          </template>

          <template #column-cell="{ row }">
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ row.original.column }}
            </UBadge>
          </template>

          <template #value-cell="{ row }">
            <span v-if="row.original.value" class="text-muted">{{ row.original.value }}</span>
            <span v-else class="text-muted italic">empty</span>
          </template>

          <template #message-cell="{ row }">
            {{ row.original.message }}
          </template>
        </UTable>

        <!-- A single row-level error, the way it reads on its own. -->
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Line 47: quantity must be a whole number"
          description="The file says 2.5. A till cannot sell half an item, so this is usually a weight that ended up in the quantity column."
        />
      </div>
    </div>
  </div>
</template>
