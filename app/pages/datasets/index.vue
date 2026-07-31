<script setup lang="ts">
import { formatCount } from '#shared/format'
import type { Dataset } from '#shared/schemas'

definePageMeta({ middleware: 'auth', layout: 'app' })

useSeoMeta({ title: 'Data sets — InsightFlow' })

const { data: datasets, status } = await useFetch('/api/datasets', {
  default: (): Dataset[] => []
})

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  retail: 'Shop',
  gym: 'Gym'
}

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'businessType', header: 'Type' },
  { accessorKey: 'periodStart', header: 'Covers' },
  { accessorKey: 'rowCount', header: 'Rows' }
]
</script>

<template>
  <div>
    <UiPageHeader title="Data sets" description="Every period of sales you have uploaded.">
      <template #actions>
        <UButton to="/datasets/new">
          New data set
        </UButton>
      </template>
    </UiPageHeader>

    <div v-if="status === 'pending'" class="space-y-2">
      <USkeleton class="h-8 w-full" />
      <USkeleton class="h-8 w-full" />
    </div>

    <UiEmptyState
      v-else-if="datasets.length === 0"
      icon="i-lucide-table"
      title="No data sets yet"
      description="Add a data set to tell InsightFlow which period your sales cover."
    >
      <template #action>
        <UButton to="/datasets/new">
          New data set
        </UButton>
      </template>
    </UiEmptyState>

    <UTable v-else :data="datasets" :columns="columns">
      <template #businessType-cell="{ row }">
        {{ BUSINESS_TYPE_LABELS[row.original.businessType] ?? row.original.businessType }}
      </template>

      <template #periodStart-cell="{ row }">
        {{ row.original.periodStart }} to {{ row.original.periodEnd }}
      </template>

      <template #rowCount-cell="{ row }">
        {{ formatCount(row.original.rowCount) }}
      </template>
    </UTable>
  </div>
</template>
