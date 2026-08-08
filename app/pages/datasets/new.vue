<!--
  OWNER: M2 (data sets)

  Adding a data set, in two steps: check the file, then import.

  THE STATE THAT MATTERS
  Partial success. A shop owner exports two hundred rows from their till and six
  are malformed. Throwing the file away for six lines is the wrong answer, and so
  is importing silently and losing them. So the screen leads with what worked,
  offers to import it, then lists each failure with the line number to open.

  The check is stateless on purpose. Nothing is created until the owner presses
  import, so a file that turns out to be unusable leaves nothing behind.
-->

<script setup lang="ts">
import { datasetCreateSchema, type DatasetCreate } from '#shared/schemas'
import type { UploadReport } from '#shared/types/upload'
import { formatCount } from '#shared/format'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Add a data set - InsightFlow' })

const BUSINESS_TYPES = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Shop', value: 'retail' },
  { label: 'Gym', value: 'gym' }
]

const today = new Date().toISOString().slice(0, 10)

const state = reactive<DatasetCreate>({
  name: '',
  businessType: 'restaurant',
  periodStart: today,
  periodEnd: today,
  notes: undefined
})

const csv = ref<string | null>(null)
const fileName = ref<string | null>(null)
const fileError = ref<string | null>(null)
const serverError = ref<string | null>(null)
const report = ref<UploadReport | null>(null)
const checking = ref(false)
const importing = ref(false)

const problemColumns = [
  { accessorKey: 'line', header: 'Line' },
  { accessorKey: 'column', header: 'Column' },
  { accessorKey: 'value', header: 'What the file says' },
  { accessorKey: 'message', header: 'What is wrong' }
]

function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const response = error as { statusMessage?: string, data?: { statusMessage?: string } }
    return response.data?.statusMessage ?? response.statusMessage ?? fallback
  }
  return fallback
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  fileError.value = null
  report.value = null
  csv.value = null
  fileName.value = null

  if (!file) return

  if (!file.name.toLowerCase().endsWith('.csv')) {
    fileError.value = 'That file is not a CSV. Export your sales from the till as CSV and try again.'
    input.value = ''
    return
  }

  csv.value = await file.text()
  fileName.value = file.name
}

async function checkFile() {
  if (!csv.value) {
    fileError.value = 'Choose a CSV file first.'
    return
  }

  checking.value = true
  serverError.value = null

  try {
    report.value = await $fetch<UploadReport>('/api/datasets/preview', {
      method: 'POST',
      body: { csv: csv.value }
    })
  } catch (error) {
    serverError.value = messageFrom(error, 'That file could not be read. Please try again.')
  } finally {
    checking.value = false
  }
}

async function importRows() {
  if (!csv.value) return

  importing.value = true
  serverError.value = null

  try {
    // The data set is created only now, once the owner has seen what will import.
    const dataset = await $fetch('/api/datasets', { method: 'POST', body: state })

    await $fetch(`/api/datasets/${dataset.id}/rows`, {
      method: 'POST',
      body: { csv: csv.value }
    })

    await navigateTo(`/datasets/${dataset.id}`)
  } catch (error) {
    serverError.value = messageFrom(error, 'These rows could not be imported. Please try again.')
    importing.value = false
  }
}

function chooseAnotherFile() {
  report.value = null
  csv.value = null
  fileName.value = null
}
</script>

<template>
  <div class="max-w-3xl">
    <UiPageHeader
      title="Add a data set"
      description="Tell us what this period covers, then add the sales rows."
    />

    <UAlert
      v-if="serverError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="serverError"
      class="mb-6"
    />

    <!-- Step one: the details and the file -->
    <UForm
      v-if="!report"
      :schema="datasetCreateSchema"
      :state="state"
      class="space-y-8"
      @submit="checkFile"
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
            A CSV exported from your till, with a row per item sold. It needs a
            date, an item name, a quantity and a price. A total is optional. We
            work it out when it is missing.
          </p>
        </div>

        <UFormField label="CSV file" name="file" :error="fileError ?? undefined">
          <UInput type="file" accept=".csv,text/csv" class="w-full" @change="onFileChange" />
          <template v-if="fileName" #help>
            {{ fileName }} is ready to check.
          </template>
        </UFormField>

        <div class="flex flex-wrap gap-2">
          <UButton type="submit" icon="i-lucide-search" :loading="checking" :disabled="!csv">
            Check the file
          </UButton>
          <UButton to="/datasets" color="neutral" variant="subtle">
            Cancel
          </UButton>
        </div>
      </div>
    </UForm>

    <!-- Step two: what we found. What worked comes first, always. -->
    <div v-else class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-3">
        <UCard class="sm:col-span-2">
          <p class="text-xs text-muted">
            Ready to import
          </p>
          <p class="mt-1 text-2xl font-semibold" :class="report.valid > 0 ? 'text-success' : 'text-muted'">
            {{ formatCount(report.valid) }} of {{ formatCount(report.total) }} rows
          </p>
          <p v-if="report.periodStart" class="mt-2 text-sm text-muted">
            Covering {{ report.periodStart }} to {{ report.periodEnd }}.
          </p>
          <p v-if="report.invalid > 0" class="mt-2 text-sm text-muted">
            You can import these now and fix the rest later. Nothing is lost by
            importing what already works.
          </p>
        </UCard>

        <UCard>
          <p class="text-xs text-muted">
            Need attention
          </p>
          <p class="mt-1 text-2xl font-semibold" :class="report.invalid > 0 ? 'text-warning' : 'text-muted'">
            {{ formatCount(report.invalid) }} rows
          </p>
          <p class="mt-2 text-sm text-muted">
            {{ report.invalid > 0 ? 'Listed below with the line number.' : 'Nothing needs fixing.' }}
          </p>
        </UCard>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          icon="i-lucide-check"
          :loading="importing"
          :disabled="report.valid === 0"
          @click="importRows"
        >
          Import {{ formatCount(report.valid) }} rows
        </UButton>
        <UButton color="neutral" variant="subtle" icon="i-lucide-rotate-ccw" @click="chooseAnotherFile">
          Choose a different file
        </UButton>
      </div>

      <template v-if="report.invalid > 0">
        <USeparator />

        <div class="space-y-3">
          <div>
            <h2 class="text-base font-semibold">
              The {{ formatCount(report.invalid) }} rows that need fixing
            </h2>
            <p class="mt-1 text-sm text-muted">
              Open your CSV and go to these line numbers. Everything else imports fine.
            </p>
          </div>

          <UTable :data="report.problems" :columns="problemColumns">
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
        </div>
      </template>
    </div>
  </div>
</template>
