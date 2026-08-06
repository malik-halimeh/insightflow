<script setup lang="ts">
import { datasetCreateSchema, type Dataset, type DatasetCreate, type SalesRow } from '#shared/schemas'
import { formatCount, formatMoney } from '#shared/format'

definePageMeta({ middleware: 'auth', layout: 'app' })

const route = useRoute()
const id = route.params.id as string

const { data, status, error } = await useFetch<{ dataset: Dataset; rows: SalesRow[] }>(
  `/api/datasets/${id}`
)

useSeoMeta({
  title: computed(() => data.value ? `${data.value.dataset.name} — InsightFlow` : 'Data set — InsightFlow')
})

const BUSINESS_TYPES = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Shop', value: 'retail' },
  { label: 'Gym', value: 'gym' }
]

const dataset = computed(() => data.value?.dataset ?? null)
const rows = computed(() => data.value?.rows ?? [])

const state = reactive<DatasetCreate>({
  name: '',
  businessType: 'restaurant',
  periodStart: '',
  periodEnd: '',
  notes: undefined
})

// Populate form once the dataset loads
watch(dataset, (d) => {
  if (!d) return
  state.name = d.name
  state.businessType = d.businessType
  state.periodStart = d.periodStart
  state.periodEnd = d.periodEnd
  state.notes = d.notes
}, { immediate: true })

const saving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref(false)
const toast = useToast()

async function onSave() {
  if (saving.value) return
  saving.value = true
  saveError.value = null
  saveSuccess.value = false

  try {
    const updated = await $fetch<Dataset>(`/api/datasets/${id}`, {
      method: 'PATCH',
      body: state
    })
    // Reflect the saved name in the page without a full reload
    if (data.value) data.value.dataset = updated
    toast.add({ title: 'Saved', icon: 'i-lucide-check', color: 'success' })
  } catch (err: any) {
    saveError.value = err?.data?.statusMessage ?? err?.message ?? 'Could not save. Please try again.'
  } finally {
    saving.value = false
  }
}

const rowColumns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'itemName', header: 'Item' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'quantity', header: 'Sold' },
  { accessorKey: 'unitPrice', header: 'Price' },
  { accessorKey: 'revenue', header: 'Total' }
]

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div>
    <!-- Error -->
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Could not load this data set"
      description="Refresh the page to try again."
    />

    <!-- Loading -->
    <div v-else-if="status === 'pending'" class="space-y-4">
      <USkeleton class="h-10 w-64" />
      <div class="grid gap-4 sm:grid-cols-3">
        <USkeleton v-for="card in 3" :key="card" class="h-24 w-full" />
      </div>
      <USkeleton class="h-64 w-full" />
    </div>

    <div v-else-if="dataset" class="space-y-8">
      <UiPageHeader :title="dataset.name" description="Everything InsightFlow knows about this period.">
        <template #actions>
          <UButton to="/datasets" color="neutral" variant="subtle" icon="i-lucide-arrow-left">
            All data sets
          </UButton>
        </template>
      </UiPageHeader>

      <!-- Summary cards -->
      <div class="grid gap-4 sm:grid-cols-3">
        <UiMetricCard label="Rows" :value="formatCount(dataset.rowCount)" />
        <UiMetricCard
          label="Covers"
          :value="`${shortDate(dataset.periodStart)} – ${shortDate(dataset.periodEnd)}`"
        />
        <UiMetricCard label="Added" :value="shortDate(dataset.createdAt)" />
      </div>

      <!-- Edit form -->
      <div>
        <h2 class="text-base font-semibold">
          Details
        </h2>
        <p class="mt-1 mb-4 text-sm text-muted">
          Changing these does not change the sales rows.
        </p>

        <UAlert
          v-if="saveError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="saveError"
          class="mb-4"
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

      <USeparator />

      <!-- Rows preview -->
      <div>
        <h2 class="text-base font-semibold">
          Sales rows
        </h2>
        <p class="mt-1 mb-4 text-sm text-muted">
          The first {{ rows.length }} of {{ formatCount(dataset.rowCount) }}, newest first.
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
              {{ row.original.category ?? '—' }}
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
