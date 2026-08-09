<script setup lang="ts">
import { datasetCreateSchema, type Dataset, type DatasetCreate, type SalesRow } from '#shared/schemas'
import { formatCount } from '#shared/format'

definePageMeta({ middleware: 'auth', layout: 'app' })

const route = useRoute()
const id = String(route.params.id)

const { data: dataset, error, refresh } = await useFetch<Dataset>(`/api/datasets/${id}`)

if (error.value || !dataset.value) {
  throw createError({ statusCode: 404, statusMessage: 'That data set could not be found.' })
}

useSeoMeta({ title: () => `${dataset.value?.name ?? 'Data set'} | InsightFlow` })

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


const uploading = ref(false)
const uploadSuccess = ref(false)

async function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  uploadSuccess.value = false
  serverError.value = null

  try {
    const csvText = await file.text()
    await $fetch(`/api/datasets/${id}/rows`, {
      method: 'POST',
      body: { csv: csvText }
    })
    
    await Promise.all([refresh(), refreshRows()])
    uploadSuccess.value = true
  } catch (err: any) {
    serverError.value = err?.data?.statusMessage || 'Failed to upload CSV file.'
  } finally {
    uploading.value = false
    target.value = ''
  }
}

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
</script>

<template>
  <div>
    <NuxtPage v-if="$route.path.endsWith('/history')" />

    <div v-else-if="dataset" class="space-y-8">
      <UiPageHeader :title="dataset.name" description="Everything InsightFlow knows about this period.">
        <template #actions>
          <UButton to="/datasets" color="neutral" variant="subtle" icon="i-lucide-arrow-left">
            All data sets
          </UButton>
          <UButton :to="`/datasets/${id}/history`" color="neutral" variant="outline" icon="i-lucide-history">
            Version History
          </UButton>
        </template>
      </UiPageHeader>

      <UAlert
        v-if="serverError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :description="serverError"
      />

      
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">Upload New CSV Version</h3>
        </template>
        
        <div class="flex items-center gap-4 py-2">
          <input
            type="file"
            accept=".csv"
            id="csvInput"
            class="hidden"
            @change="onFileSelected"
          />
          <label
            for="csvInput"
            class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span v-if="uploading">Uploading...</span>
            <span v-else>Choose CSV File</span>
          </label>
          
          <span v-if="uploadSuccess" class="text-sm font-medium text-green-600">
            New version uploaded and added to history!
          </span>
        </div>
      </UCard>

      
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">Edit Data Set Details</h3>
        </template>

        <UForm :schema="datasetCreateSchema" :state="state" class="space-y-4" @submit="onSave">
          <UFormField label="Name" name="name">
            <UInput v-model="state.name" class="w-full" />
          </UFormField>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <UFormField label="Business Type" name="businessType">
              <USelect v-model="state.businessType" :items="BUSINESS_TYPES" class="w-full" />
            </UFormField>

            <UFormField label="Period Start" name="periodStart">
              <UInput v-model="state.periodStart" type="date" class="w-full" />
            </UFormField>

            <UFormField label="Period End" name="periodEnd">
              <UInput v-model="state.periodEnd" type="date" class="w-full" />
            </UFormField>
          </div>

          <UFormField label="Notes" name="notes">
            <UTextarea v-model="state.notes" class="w-full" />
          </UFormField>

          <div class="flex items-center gap-3">
            <UButton type="submit" :loading="saving" icon="i-lucide-check">
              Save changes
            </UButton>
            <span v-if="saved" class="text-sm font-medium text-green-600">Changes saved successfully!</span>
          </div>
        </UForm>
      </UCard>

      
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold">Sales Preview</h3>
            <span class="text-xs text-muted">{{ formatCount(dataset.rowCount) }} total rows</span>
          </div>
        </template>

        <UTable :data="rows" :columns="rowColumns" />
      </UCard>
    </div>
  </div>
</template>
