<!--
  OWNER: M2 (data sets)

  Wired to /api/datasets. The delete confirmation names what actually disappears,
  and the endpoint behind it removes the sales rows, the recommendations and any
  published insight in one go, so the wording is a promise the server keeps.
-->

<script setup lang="ts">
import type { Dataset } from '#shared/schemas'
import { formatCount } from '#shared/format'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Data sets - InsightFlow' })

const {
  data: datasets,
  status,
  error,
  refresh
} = await useFetch('/api/datasets', { default: (): Dataset[] => [] })

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'periodStart', header: 'Covers' },
  { accessorKey: 'rowCount', header: 'Rows' },
  { accessorKey: 'createdAt', header: 'Added' },
  { accessorKey: 'id', header: '' }
]

const deleteOpen = ref(false)
const pendingDelete = ref<Dataset | null>(null)
const deleting = ref(false)
const serverError = ref<string | null>(null)

function askToDelete(dataset: Dataset) {
  pendingDelete.value = dataset
  deleteOpen.value = true
}

async function onDelete() {
  const dataset = pendingDelete.value
  if (!dataset) return

  deleteOpen.value = false
  deleting.value = true
  serverError.value = null

  try {
    await $fetch(`/api/datasets/${dataset.id}`, { method: 'DELETE' })
    await refresh()
  } catch (requestError) {
    serverError.value = (requestError as { statusMessage?: string }).statusMessage
      ?? 'This data set could not be deleted. Please try again.'
  } finally {
    deleting.value = false
    pendingDelete.value = null
  }
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div>
    <UiPageHeader title="Data sets" description="Every period of sales you have uploaded.">
      <template #actions>
        <UButton to="/datasets/new" icon="i-lucide-plus">
          Add data set
        </UButton>
      </template>
    </UiPageHeader>

    <UAlert
      v-if="serverError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="serverError"
      class="mb-4"
    />

    <div v-if="status === 'pending'" class="space-y-2">
      <USkeleton v-for="row in 4" :key="row" class="h-12 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Your data sets could not be loaded"
      description="Your data is safe. Refresh the page to try again."
    />

    <UiEmptyState
      v-else-if="datasets.length === 0"
      icon="i-lucide-table"
      title="No data sets yet"
      description="Add your first period of sales and InsightFlow will start finding patterns in it."
    >
      <template #action>
        <UButton to="/datasets/new" icon="i-lucide-plus">
          Add data set
        </UButton>
      </template>
    </UiEmptyState>

    <UTable v-else :data="datasets" :columns="columns">
      <template #name-cell="{ row }">
        <ULink :to="`/datasets/${row.original.id}`" class="font-medium">
          {{ row.original.name }}
        </ULink>
        <p v-if="row.original.notes" class="mt-0.5 text-xs text-muted">
          {{ row.original.notes }}
        </p>
      </template>

      <template #periodStart-cell="{ row }">
        {{ shortDate(row.original.periodStart) }} to {{ shortDate(row.original.periodEnd) }}
      </template>

      <template #rowCount-cell="{ row }">
        {{ formatCount(row.original.rowCount) }}
      </template>

      <template #createdAt-cell="{ row }">
        {{ shortDate(row.original.createdAt) }}
      </template>

      <template #id-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton
            :to="`/datasets/${row.original.id}`"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-pencil"
            aria-label="Open data set"
          />
          <UButton
            color="error"
            variant="ghost"
            size="xs"
            icon="i-lucide-trash-2"
            :loading="deleting && pendingDelete?.id === row.original.id"
            aria-label="Delete data set"
            @click="askToDelete(row.original)"
          />
        </div>
      </template>
    </UTable>

    <UModal v-model:open="deleteOpen" title="Delete this data set?">
      <template #body>
        <div v-if="pendingDelete" class="space-y-3 text-sm">
          <p>
            Deleting <strong>{{ pendingDelete.name }}</strong> also deletes:
          </p>
          <ul class="list-disc space-y-1 pl-5 text-muted">
            <li>{{ formatCount(pendingDelete.rowCount) }} sales rows</li>
            <li>
              every recommendation found in
              {{ shortDate(pendingDelete.periodStart) }} to {{ shortDate(pendingDelete.periodEnd) }}
            </li>
            <li>any insight you published from it, including its public link</li>
          </ul>
          <p>This cannot be undone.</p>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="subtle" @click="deleteOpen = false">
            Keep it
          </UButton>
          <UButton color="error" @click="onDelete">
            Delete data set
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
