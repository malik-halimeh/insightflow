<!--
  OWNER: M2 (data sets)

  WHAT THIS IS
  A finished layout with fake data typed into the file. Nothing here talks to a
  server. Your job is to swap the fake data for real data without changing how it
  looks.

  WHAT TO REPLACE
  1. `DEMO_DATASETS` — delete it and load the real list instead:
       const { data: datasets } = await useFetch('/api/datasets')
     `useFetch` goes at the top level of the file, never inside a function.
  2. `demoState` and the dashed "Preview state" box — delete both. They exist only
     so you can see each state while building. Drive the states from useFetch's
     `status` instead: 'pending' is loading, an empty array is the empty state.
  3. `onDelete` — call your delete endpoint, then refresh the list.

  WHAT NOT TO CHANGE
  - The class names. They come from docs/DESIGN-SYSTEM.md. If a page needs a style
    that is not in that document, ask M1 rather than inventing one.
  - The three states. Every page must still show loading, empty and ready.
  - The delete wording. It names what is actually lost on purpose.
-->

<script setup lang="ts">
import type { Dataset } from '#shared/schemas'
import { formatCount } from '#shared/format'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Data sets — InsightFlow' })

const DEMO_STATES = [
  { label: 'Ready', value: 'ready' },
  { label: 'Loading', value: 'loading' },
  { label: 'Empty', value: 'empty' }
]
const demoState = ref<'ready' | 'loading' | 'empty'>('ready')

const DEMO_DATASETS: Dataset[] = [
  {
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
  },
  {
    id: '6a6d2789e5be8b2def8ad117',
    name: 'Spring menu trial',
    businessType: 'restaurant',
    periodStart: '2026-04-01',
    periodEnd: '2026-05-13',
    rowCount: 412,
    currentVersionId: null,
    createdAt: '2026-05-14T09:05:00.000Z',
    updatedAt: '2026-05-14T09:05:00.000Z'
  },
  {
    id: '6a6d2789e5be8b2def8ad118',
    name: 'Christmas 2025',
    businessType: 'restaurant',
    periodStart: '2025-12-01',
    periodEnd: '2025-12-31',
    rowCount: 288,
    currentVersionId: null,
    notes: 'Two days missing — the till was down on the 24th and 25th.',
    createdAt: '2026-01-04T11:40:00.000Z',
    updatedAt: '2026-01-04T11:40:00.000Z'
  }
]

const datasets = computed(() => (demoState.value === 'ready' ? DEMO_DATASETS : []))

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'periodStart', header: 'Covers' },
  { accessorKey: 'rowCount', header: 'Rows' },
  { accessorKey: 'createdAt', header: 'Added' },
  { accessorKey: 'id', header: '' }
]

const deleteOpen = ref(false)
const pendingDelete = ref<Dataset | null>(null)

function askToDelete(dataset: Dataset) {
  pendingDelete.value = dataset
  deleteOpen.value = true
}

function onDelete() {
  // M2: call the delete endpoint here, then refresh the list.
  deleteOpen.value = false
  pendingDelete.value = null
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
      <USelect v-model="demoState" :items="DEMO_STATES" size="xs" class="w-32" />
    </div>

    <UiPageHeader title="Data sets" description="Every period of sales you have uploaded.">
      <template #actions>
        <UButton to="/datasets/new" icon="i-lucide-plus">
          Add data set
        </UButton>
      </template>
    </UiPageHeader>

    <!-- Loading -->
    <div v-if="demoState === 'loading'" class="space-y-2">
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

    <!-- Ready -->
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

    <!--
      The confirmation names what disappears. "Are you sure?" tells an owner
      nothing they can weigh up.
    -->
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
        <div class="flex justify-end gap-2">
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
