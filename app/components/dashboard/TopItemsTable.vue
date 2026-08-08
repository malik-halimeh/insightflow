<!--
  OWNER: M3 (dashboard and analytics)

  Every item, best seller first. Money and counts go through the shared formatters,
  so a figure here reads identically to the same figure anywhere else.
-->

<script setup lang="ts">
import { formatCount, formatMoney } from '#shared/format'
import type { TopItemStat } from '#shared/types/analytics'

defineProps<{ items: TopItemStat[] }>()

const columns = [
  { accessorKey: 'itemName', header: 'Item' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'unitsSold', header: 'Sold' },
  { accessorKey: 'revenue', header: 'Revenue' }
]
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-base font-semibold">Every item, best to worst</h2>
      <p class="mt-1 text-sm text-muted">Sorted by how many were sold.</p>
    </template>

    <UiEmptyState
      v-if="items.length === 0"
      icon="i-lucide-package"
      title="No items to rank yet"
      description="Add a data set with sales rows and every item you sell appears here."
    />

    <UTable v-else :data="items" :columns="columns">
      <template #itemName-cell="{ row }">
        <span class="font-medium">{{ row.original.itemName }}</span>
      </template>

      <template #category-cell="{ row }">
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ row.original.category }}
        </UBadge>
      </template>

      <template #unitsSold-cell="{ row }">
        {{ formatCount(row.original.unitsSold) }}
      </template>

      <template #revenue-cell="{ row }">
        {{ formatMoney(row.original.revenue) }}
      </template>
    </UTable>
  </UCard>
</template>
