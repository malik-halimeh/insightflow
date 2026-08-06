<!--
  OWNER: M3 (dashboard and analytics)

  The top five items, best seller first. "vs. next best seller" compares each row
  against the item immediately behind it in the *full* ranking — not just the rows
  on screen — so the fifth row still shows a real lead over the sixth item even
  though that item is never displayed.

  Money and counts go through the shared formatters, so a figure here reads
  identically to the same figure anywhere else.
-->

<script setup lang="ts">
import { formatCount, formatMoney } from '#shared/format'
import type { TopItemStat } from '#shared/types/analytics'

const props = defineProps<{ items: TopItemStat[] }>()

const DISPLAY_LIMIT = 5

interface RankedItem extends TopItemStat {
  leadPercent: number | null
}

const ranked = computed<RankedItem[]>(() =>
  props.items.slice(0, DISPLAY_LIMIT).map((item, index) => {
    const next = props.items[index + 1]
    const leadPercent = next && next.unitsSold > 0
      ? Math.round(((item.unitsSold - next.unitsSold) / next.unitsSold) * 1000) / 10
      : null

    return { ...item, leadPercent }
  })
)

const columns = [
  { accessorKey: 'itemName', header: 'Item' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'unitsSold', header: 'Units' },
  { accessorKey: 'revenue', header: 'Revenue' },
  { accessorKey: 'leadPercent', header: 'vs. next best seller' }
]
</script>

<template>
  <div>
    <h2 class="text-base font-semibold">
      Top sellers
    </h2>
    <p class="mt-1 mb-4 text-sm text-muted">
      Ranked by units sold. Each row shows how far it leads the item below it.
    </p>

    <UiEmptyState
      v-if="items.length === 0"
      icon="i-lucide-package"
      title="No items to rank yet"
      description="Add a data set with sales rows and every item you sell appears here."
    />

    <UTable v-else :data="ranked" :columns="columns">
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

      <template #leadPercent-cell="{ row }">
        <UiChangeIndicator v-if="row.original.leadPercent !== null" :value="row.original.leadPercent" />
        <span v-else class="text-sm text-muted">—</span>
      </template>
    </UTable>
  </div>
</template>
