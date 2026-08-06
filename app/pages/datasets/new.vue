<script setup lang="ts">
import { datasetCreateSchema, type DatasetCreate } from '#shared/schemas'
import { formatCount } from '#shared/format'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Add a data set — InsightFlow' })

const BUSINESS_TYPES = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Shop', value: 'retail' },
  { label: 'Gym', value: 'gym' }
]

type PageState = 'form' | 'checking' | 'partial' | 'clean'

const pageState = ref<PageState>('form')

const state = reactive<DatasetCreate>({
  name: '',
  businessType: 'restaurant',
  periodStart: '',
  periodEnd: '',
  notes: undefined
})

interface RowProblem {
  line: number
  column: string
  value: string
  message: string
}

interface CheckResult {
  total: number
  valid: number
  invalid: number
  problems: RowProblem[]
}

const checkResult = ref<CheckResult | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
// Store the File object itself — fileInput is removed from the DOM when the
// form state changes, so reading fileInput.value?.files?.[0] after that
// always returns undefined. Capturing it here survives any re-render.
const selectedFile = ref<File | null>(null)
const serverError = ref<string | null>(null)

function onFileChange(e: Event) {
  selectedFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

const problemColumns = [
  { accessorKey: 'line', header: 'Line' },
  { accessorKey: 'column', header: 'Column' },
  { accessorKey: 'value', header: 'What the file says' },
  { accessorKey: 'message', header: 'What is wrong' }
]

// Validate the metadata form before we bother sending the file
function validateForm(): string | null {
  if (!state.name || state.name.length < 3) return 'Please give this data set a name of at least 3 characters.'
  if (!state.businessType) return 'Please choose a business type.'
  if (!state.periodStart) return 'Please set the first day.'
  if (!state.periodEnd) return 'Please set the last day.'
  if (state.periodEnd < state.periodStart) return 'The end date cannot be before the start date.'
  return null
}

async function onCheckFile() {
  serverError.value = null

  const formError = validateForm()
  if (formError) { serverError.value = formError; return }

  const file = selectedFile.value
  if (!file) { serverError.value = 'Please choose a CSV file before checking.'; return }

  pageState.value = 'checking'
  checkResult.value = null

  const body = new FormData()
  body.append('file', file)

  try {
    const result = await $fetch<CheckResult>('/api/datasets/check', { method: 'POST', body })
    checkResult.value = result
    pageState.value = result.invalid === 0 ? 'clean' : 'partial'
  } catch (err: any) {
    const msg = err?.data?.statusMessage ?? err?.message ?? 'Something went wrong checking the file. Please try again.'
    serverError.value = msg
    pageState.value = 'form'
  }
}

const router = useRouter()
const importing = ref(false)

async function onImport() {
  if (importing.value) return
  const file = selectedFile.value
  if (!file) { serverError.value = 'The file is no longer available. Please choose it again.'; pageState.value = 'form'; return }

  importing.value = true
  serverError.value = null

  const body = new FormData()
  body.append('file', file)
  body.append('name', state.name)
  body.append('businessType', state.businessType)
  body.append('periodStart', state.periodStart)
  body.append('periodEnd', state.periodEnd)
  if (state.notes) body.append('notes', state.notes)

  try {
    const result = await $fetch<{ id: string; rowCount: number }>('/api/datasets/import', { method: 'POST', body })
    await router.push(`/datasets/${result.id}`)
  } catch (err: any) {
    const msg = err?.data?.statusMessage ?? err?.message ?? 'Import failed. Please try again.'
    serverError.value = msg
    importing.value = false
  }
}

function onStartOver() {
  pageState.value = 'form'
  checkResult.value = null
  serverError.value = null
  importing.value = false
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="max-w-3xl">
    <UiPageHeader
      title="Add a data set"
      description="Tell us what this period covers, then add the sales rows."
    />

    <!-- Server-side error banner (shown in form state or after a failed check) -->
    <UAlert
      v-if="serverError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="serverError"
      class="mb-6"
    />

    <!-- ------------------------------------------------------------------ -->
    <!-- FORM STATE                                                           -->
    <!-- ------------------------------------------------------------------ -->
    <UForm
      v-if="pageState === 'form'"
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
          <input
            ref="fileInput"
            type="file"
            accept=".csv,text/csv"
            class="w-full"
            @change="onFileChange"
          />
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

    <!-- ------------------------------------------------------------------ -->
    <!-- CHECKING STATE                                                       -->
    <!-- ------------------------------------------------------------------ -->
    <div v-else-if="pageState === 'checking'" class="space-y-4">
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

    <!-- ------------------------------------------------------------------ -->
    <!-- CLEAN STATE — every row is valid                                    -->
    <!-- ------------------------------------------------------------------ -->
    <div v-else-if="pageState === 'clean' && checkResult" class="space-y-6">
      <UAlert
        color="success"
        variant="subtle"
        icon="i-lucide-check"
        :title="`All ${formatCount(checkResult.total)} rows are ready`"
        description="Nothing needs fixing. Import them and InsightFlow will start looking for patterns."
      />
      <div class="flex flex-wrap gap-2">
        <UButton icon="i-lucide-check" :loading="importing" @click="onImport">
          Import {{ formatCount(checkResult.total) }} rows
        </UButton>
        <UButton color="neutral" variant="subtle" :disabled="importing" @click="onStartOver">
          Choose a different file
        </UButton>
      </div>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- PARTIAL STATE — some rows have problems                             -->
    <!-- ------------------------------------------------------------------ -->
    <div v-else-if="pageState === 'partial' && checkResult" class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-3">
        <UCard class="sm:col-span-2">
          <p class="text-xs text-muted">
            Ready to import
          </p>
          <p class="mt-1 text-2xl font-semibold text-success">
            {{ formatCount(checkResult.valid) }} of {{ formatCount(checkResult.total) }} rows
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
            {{ formatCount(checkResult.invalid) }} rows
          </p>
          <p class="mt-2 text-sm text-muted">
            Listed below with the line number.
          </p>
        </UCard>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton icon="i-lucide-check" :loading="importing" @click="onImport">
          Import {{ formatCount(checkResult.valid) }} rows
        </UButton>
        <UButton color="neutral" variant="subtle" icon="i-lucide-rotate-ccw" :disabled="importing" @click="onStartOver">
          Fix the file and try again
        </UButton>
      </div>

      <USeparator />

      <div class="space-y-3">
        <div>
          <h2 class="text-base font-semibold">
            The {{ formatCount(checkResult.invalid) }} rows that need fixing
          </h2>
          <p class="mt-1 text-sm text-muted">
            Open your CSV and go to these line numbers. Everything else imports fine.
          </p>
        </div>

        <UTable :data="checkResult.problems" :columns="problemColumns">
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
    </div>
  </div>
</template>
