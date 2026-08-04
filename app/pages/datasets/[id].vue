<!--
  OWNER: M2 (data sets)

  One data set: its totals, an edit form and a preview of the rows inside it.

  The edit form binds to datasetCreateSchema, never to datasetSchema. The record
  schema also demands the id, the row count and the timestamps, which the server
  owns and the form does not send — bind to it and every save is rejected with an
  error that has no field to appear in, so the button silently does nothing.
-->

<script setup lang="ts">
import { datasetCreateSchema, type Dataset, type DatasetCreate, type SalesRow } from '#shared/schemas'
import { formatCount, formatMoney } from '#shared/format'

definePageMeta({ middleware: 'auth', layout: 'app' })

const route = useRoute()
const id = String(route.params.id)

const { data: dataset, status, error, refresh } = await useFetch<Dataset>(`/api/datasets/${id}`)

if (error.value || !dataset.value) {
  throw createError({ statusCode: 404, statusMessage: 'That data set could not be found.' })
}

useSeoMeta({ title: () => `${dataset.value?.name ?? 'Data set'} — InsightFlow` })

// A sample, not the whole file. The endpoint caps it, because nobody scrolls six
// hundred rows and sending them all just makes the page slow.
const { data: rows, refresh: refreshRows } = await useFetch<SalesRow[]>(`/api/datasets/${id}/rows`, {
  default: (): SalesRow[] => []
})

const rowColumns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'itemName', header: 'Item' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'quantity', header: 'Sold' },
  { accessorKey: 'unitPrice', header: 'Price' },
  { accessorKey: 'revenue', header: 'Total' }
]

const BUSINESS_TYPES = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Shop', value: 'retail' },
  { label: 'Gym', value: 'gym' }
]

const state = reactive<DatasetCreate>({
  name: dataset.value.name,
  businessType: dataset.value.businessType,
  periodStart: dataset.value.periodStart,
  periodEnd: dataset.value.periodEnd,
  notes: dataset.value.notes
})

const saving = ref(false)
const saved = ref(false)
const serverError = ref<string | null>(null)

async function onSave() {
  saving.value = true
  saved.value = false
  serverError.value = null

  try {
    await $fetch(`/api/datasets/${id}`, { method: 'PUT', body: state })
    await Promise.all([refresh(), refreshRows()])
    saved.value = true
  } catch (requestError) {
    serverError.value = (requestError as { statusMessage?: string }).statusMessage
      ?? 'These changes could not be saved. Please try again.'
  } finally {
    saving.value = false
  }
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div v-if="dataset">
    <UiPageHeader :title="dataset.name" description="Everything InsightFlow knows about this period.">
      <template #actions>
        <UButton to="/datasets" color="neutral" variant="subtle" icon="i-lucide-arrow-left">
          All data sets
        </UButton>
      </template>
    </UiPageHeader>

    <div v-if="status === 'pending'" class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-3">
        <USkeleton v-for="card in 3" :key="card" class="h-24 w-full" />
      </div>
      <USkeleton class="h-64 w-full" />
    </div>

    <div v-else class="space-y-8">
      <div class="grid gap-4 sm:grid-cols-3">
        <UiMetricCard label="Rows" :value="formatCount(dataset.rowCount)" />
        <UiMetricCard
          label="Covers"
          :value="`${shortDate(dataset.periodStart)} – ${shortDate(dataset.periodEnd)}`"
        />
        <UiMetricCard label="Added" :value="shortDate(dataset.createdAt)" />
      </div>

      <UiEmptyState
        v-if="dataset.rowCount === 0"
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

      <div>
        <h2 class="text-base font-semibold">
          Details
        </h2>
        <p class="mt-1 mb-4 text-sm text-muted">
          Changing these does not change the sales rows.
        </p>

        <UAlert
          v-if="serverError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="serverError"
          class="mb-4 max-w-xl"
        />

        <UAlert
          v-else-if="saved"
          color="success"
          variant="subtle"
          icon="i-lucide-check"
          description="Your changes are saved."
          class="mb-4 max-w-xl"
        />

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

          <UButton type="submit" :loading="saving">
            Save changes
          </UButton>
        </UForm>
      </div>

      <template v-if="rows.length > 0">
        <USeparator />

        <div>
          <h2 class="text-base font-semibold">
            Sales rows
          </h2>
          <p class="mt-1 mb-4 text-sm text-muted">
            The {{ rows.length }} most recent of {{ formatCount(dataset.rowCount) }}.
          </p>

          <UTable :data="rows" :columns="rowColumns">
            <template #date-cell="{ row }">
              {{ shortDate(row.original.date) }}
            </template>

            <template #category-cell="{ row }">
              <UBadge v-if="row.original.category" color="neutral" variant="subtle" size="sm">
                {{ row.original.category }}
              </UBadge>
              <span v-else class="text-muted">—</span>
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
      </template>
    </div>
  </div>
</template>
