<!--
  OWNER: M2 (data sets)

  WHAT THIS IS
  One data set: its details, a form to edit them, and a preview of the sales rows
  inside it. Nothing here talks to a server.

  WHAT TO REPLACE
  1. `DEMO_DATASET` and `DEMO_ROWS` — load the real ones. The id is already in the
     URL, so `const route = useRoute()` gives you `route.params.id`.
  2. `demoState` and the dashed box — delete both, and drive the states from the
     real request instead.
  3. `onSave` — call your update endpoint from inside the function with `$fetch`.

  WHAT NOT TO CHANGE
  - The edit form binds to `datasetCreateSchema`, not `datasetSchema`. The record
    schema includes the id and the timestamps, which the server owns. A form bound
    to it cannot submit and shows no error explaining why.
  - The preview shows the first rows only. Do not load 600 rows into this page.
  - The class names. They come from docs/DESIGN-SYSTEM.md.
-->

<script setup lang="ts">
import { datasetCreateSchema, type Dataset, type DatasetCreate, type SalesRow } from '#shared/schemas'
import { formatCount, formatMoney } from '#shared/format'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Data set — InsightFlow' })

const DEMO_STATES = [
  { label: 'Ready', value: 'ready' },
  { label: 'Loading', value: 'loading' },
  { label: 'No rows yet', value: 'empty' }
]
const demoState = ref<'ready' | 'loading' | 'empty'>('ready')

const DEMO_DATASET: Dataset = {
  id: '6a6d2789e5be8b2def8ad116',
  name: 'Bella Pizza — last 8 weeks',
  businessType: 'restaurant',
  periodStart: '2026-06-05',
  periodEnd: '2026-07-30',
  rowCount: 630,
  currentVersionId: null,
  notes: 'Exported from the till on the 31st.',
  createdAt: '2026-07-31T18:20:00.000Z',
  updatedAt: '2026-07-31T18:20:00.000Z'
}

const DEMO_ROWS: SalesRow[] = [
  { id: '6a6d2789e5be8b2def8ad201', datasetId: DEMO_DATASET.id, date: '2026-07-30', itemName: 'House Fries', category: 'Sides', quantity: 52, unitPrice: 3, revenue: 156 },
  { id: '6a6d2789e5be8b2def8ad202', datasetId: DEMO_DATASET.id, date: '2026-07-30', itemName: 'Margherita Pizza', category: 'Mains', quantity: 21, unitPrice: 9.5, revenue: 199.5 },
  { id: '6a6d2789e5be8b2def8ad203', datasetId: DEMO_DATASET.id, date: '2026-07-30', itemName: 'Soft Drink', category: 'Drinks', quantity: 28, unitPrice: 2.5, revenue: 70 },
  { id: '6a6d2789e5be8b2def8ad204', datasetId: DEMO_DATASET.id, date: '2026-07-30', itemName: 'Tiramisu', category: 'Desserts', quantity: 9, unitPrice: 6.5, revenue: 58.5 },
  { id: '6a6d2789e5be8b2def8ad205', datasetId: DEMO_DATASET.id, date: '2026-07-29', itemName: 'House Fries', category: 'Sides', quantity: 38, unitPrice: 3, revenue: 114 },
  { id: '6a6d2789e5be8b2def8ad206', datasetId: DEMO_DATASET.id, date: '2026-07-29', itemName: 'Pepperoni Pizza', category: 'Mains', quantity: 14, unitPrice: 11, revenue: 154 }
]

const rows = computed(() => (demoState.value === 'ready' ? DEMO_ROWS : []))

const BUSINESS_TYPES = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Shop', value: 'retail' },
  { label: 'Gym', value: 'gym' }
]

const state = reactive<DatasetCreate>({
  name: DEMO_DATASET.name,
  businessType: DEMO_DATASET.businessType,
  periodStart: DEMO_DATASET.periodStart,
  periodEnd: DEMO_DATASET.periodEnd,
  notes: DEMO_DATASET.notes
})

const rowColumns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'itemName', header: 'Item' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'quantity', header: 'Sold' },
  { accessorKey: 'unitPrice', header: 'Price' },
  { accessorKey: 'revenue', header: 'Total' }
]

function onSave() {
  // M2: send the update, then show a confirmation.
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div>
    <!-- Scaffolding: delete this box and `demoState` when you wire real data. -->
    <div class="mb-8 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-default p-3">
      <span class="text-xs text-muted">Preview state</span>
      <USelect v-model="demoState" :items="DEMO_STATES" size="xs" class="w-36" />
    </div>

    <UiPageHeader :title="DEMO_DATASET.name" description="Everything InsightFlow knows about this period.">
      <template #actions>
        <UButton to="/datasets" color="neutral" variant="subtle" icon="i-lucide-arrow-left">
          All data sets
        </UButton>
      </template>
    </UiPageHeader>

    <!-- Loading -->
    <div v-if="demoState === 'loading'" class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-3">
        <USkeleton v-for="card in 3" :key="card" class="h-24 w-full" />
      </div>
      <USkeleton class="h-64 w-full" />
    </div>

    <div v-else class="space-y-8">
      <!-- Details -->
      <div class="grid gap-4 sm:grid-cols-3">
        <UiMetricCard label="Rows" :value="formatCount(DEMO_DATASET.rowCount)" />
        <UiMetricCard
          label="Covers"
          :value="`${shortDate(DEMO_DATASET.periodStart)} – ${shortDate(DEMO_DATASET.periodEnd)}`"
        />
        <UiMetricCard label="Added" :value="shortDate(DEMO_DATASET.createdAt)" />
      </div>

      <!-- Edit -->
      <div>
        <h2 class="text-base font-semibold">
          Details
        </h2>
        <p class="mt-1 mb-4 text-sm text-muted">
          Changing these does not change the sales rows.
        </p>

        <UForm
          :schema="datasetCreateSchema"
          :state="state"
          class="max-w-xl space-y-4"
          @submit="onSave"
        >
          <UFormField label="Name" name="name">
            <UInput v-model="state.name" class="w-full" />
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
            <UTextarea v-model="state.notes" :rows="3" class="w-full" />
          </UFormField>

          <UButton type="submit">
            Save changes
          </UButton>
        </UForm>
      </div>

      <USeparator />

      <!-- Rows -->
      <div>
        <h2 class="text-base font-semibold">
          Sales rows
        </h2>
        <p class="mt-1 mb-4 text-sm text-muted">
          The first {{ rows.length }} of {{ formatCount(DEMO_DATASET.rowCount) }}, newest first.
        </p>

        <UiEmptyState
          v-if="rows.length === 0"
          icon="i-lucide-file-spreadsheet"
          title="No sales rows in this data set"
          description="The details are saved, but there is nothing to analyse until you add the sales rows."
        >
          <template #action>
            <UButton to="/datasets/new" icon="i-lucide-upload">
              Add sales rows
            </UButton>
          </template>
        </UiEmptyState>

        <UTable v-else :data="rows" :columns="rowColumns">
          <template #date-cell="{ row }">
            {{ shortDate(row.original.date) }}
          </template>

          <template #category-cell="{ row }">
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ row.original.category }}
            </UBadge>
          </template>

          <template #quantity-cell="{ row }">
            {{ formatCount(row.original.quantity) }}
          </template>

          <template #unitPrice-cell="{ row }">
            {{ formatMoney(row.original.unitPrice) }}
          </template>

          <template #revenue-cell="{ row }">
            {{ formatMoney(row.original.revenue) }}
          </template>
        </UTable>
      </div>
    </div>
  </div>
</template>
