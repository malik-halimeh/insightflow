<script setup lang="ts">
import type { Dataset } from '#shared/schemas'
import { formatCount } from '#shared/format'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Data sets — InsightFlow' })

const { data, status, refresh } = await useFetch<Dataset[]>('/api/datasets', {
  default: (): Dataset[] => []
})

const datasets = computed(() => data.value ?? [])

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
const deleteError = ref<string | null>(null)
const toast = useToast()

function askToDelete(dataset: Dataset) {
  pendingDelete.value = dataset
  deleteError.value = null
  deleteOpen.value = true
}

async function onDelete() {
  if (!pendingDelete.value || deleting.value) return
  deleting.value = true
  deleteError.value = null

  try {
    await $fetch(`/api/datasets/${pendingDelete.value.id}`, { method: 'DELETE' })
    deleteOpen.value = false
    pendingDelete.value = null
    toast.add({ title: 'Data set deleted', icon: 'i-lucide-trash-2', color: 'neutral' })
    await refresh()
  } catch (err: any) {
    deleteError.value = err?.data?.statusMessage ?? err?.message ?? 'Could not delete. Please try again.'
  } finally {
    deleting.value = false
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

    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-2">
      <USkeleton v-for="row in 4" :key="row" class="h-12 w-full" />
    </div>

    <!-- Empty -->
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

    <!-- List -->
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
            aria-label="Delete data set"
            @click="askToDelete(row.original)"
          />
        </div>
      </template>
    </UTable>

    <!-- Delete confirmation modal -->
    <UModal v-model:open="deleteOpen" title="Delete this data set?">
      <template #body>
        <div v-if="pendingDelete" class="space-y-3 text-sm">
          <UAlert
            v-if="deleteError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="deleteError"
            class="mb-2"
          />
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
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="subtle" :disabled="deleting" @click="deleteOpen = false">
            Keep it
          </UButton>
          <UButton color="error" :loading="deleting" @click="onDelete">
            Delete data set
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
