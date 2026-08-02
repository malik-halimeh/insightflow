<!--
  OWNER: M3 (dashboard and analytics)

  WHAT THIS IS
  A finished dashboard layout with fake numbers typed into the file. Nothing here
  talks to a server, and there is no chart library — the two chart areas are empty
  boxes so you can choose the library yourself.

  WHAT TO REPLACE
  1. `DEMO_TOTALS` and `DEMO_ITEMS` — real figures from your analytics endpoint.
  2. `demoState` and the dashed box — delete both, and drive the states from the
     real request instead.
  3. The two `<!-- CHART -->` boxes — put your chart inside, keeping the box.

  WHEN YOU ADD A CHART
  A chart library touches `window`, which does not exist while the page is being
  rendered on the server. CLAUDE.md rule 5: wrap the chart in a ClientOnly
  component with a skeleton fallback, or the build breaks in a way that is hard to
  read. The pattern is: a ClientOnly wrapper, your chart inside it, and a
  USkeleton in its "fallback" slot. There is a worked example in
  docs/DESIGN-SYSTEM.md.

  (Tag examples are written in words here on purpose: real tags inside a comment
  block stop a .vue file from compiling.)

  WHAT NOT TO CHANGE
  - The "not enough data" state. Eight days of sales cannot show a weekly pattern,
    and drawing a confident line over them would be a lie. Say so instead.
  - Best and worst seller carry no percentage. A single name has nothing to compare
    against, and inventing a comparison would be misleading.
  - The class names. They come from docs/DESIGN-SYSTEM.md.
-->

<script setup lang="ts">
import { formatCount, formatMoney } from '#shared/format'
import type { SalesRow } from '#shared/schemas'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Dashboard — InsightFlow' })

const DEMO_STATES = [
  { label: 'Ready', value: 'ready' },
  { label: 'Loading', value: 'loading' },
  { label: 'No data sets', value: 'empty' },
  { label: 'Not enough data', value: 'thin' }
]
const demoState = ref<'ready' | 'loading' | 'empty' | 'thin'>('ready')

const RANGES = [
  { label: 'Last 4 weeks', value: '4w' },
  { label: 'Last 8 weeks', value: '8w' },
  { label: 'Last 12 weeks', value: '12w' },
  { label: 'Everything', value: 'all' }
]
const range = ref('8w')

const DEMO_TOTALS = {
  revenue: 59555.5,
  revenueChange: 12.4,
  orders: 4182,
  ordersChange: 8.1,
  averageOrder: 14.24,
  averageOrderChange: -2.3,
  bestSeller: 'House Fries',
  worstSeller: 'Beetroot & Feta Salad'
}

/**
 * One line of the item table: the sales-row fields, totalled up, plus the change
 * against the previous period. The field names are taken from SalesRow rather than
 * retyped, so if M1 ever renames one this page fails to compile instead of quietly
 * showing blank cells.
 */
type ItemRow = Pick<SalesRow, 'itemName' | 'category' | 'quantity' | 'revenue'> & {
  changePercent: number
}

const DEMO_ITEMS: ItemRow[] = [
  { itemName: 'House Fries', category: 'Sides', quantity: 2477, revenue: 7431, changePercent: 14.2 },
  { itemName: 'Garlic Bread', category: 'Sides', quantity: 1233, revenue: 4932, changePercent: 6.8 },
  { itemName: 'Soft Drink', category: 'Drinks', quantity: 1341, revenue: 3352.5, changePercent: 2.1 },
  { itemName: 'Margherita Pizza', category: 'Mains', quantity: 1012, revenue: 9614, changePercent: -3.4 },
  { itemName: 'Grilled Chicken', category: 'Mains', quantity: 447, revenue: 5811, changePercent: -9.7 },
  { itemName: 'Beetroot & Feta Salad', category: 'Sides', quantity: 15, revenue: 127.5, changePercent: -41.2 }
]

const itemColumns = [
  { accessorKey: 'itemName', header: 'Item' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'quantity', header: 'Sold' },
  { accessorKey: 'revenue', header: 'Revenue' },
  { accessorKey: 'changePercent', header: 'Change' }
]
</script>

<template>
  <div>
    <!-- Scaffolding: delete this box and `demoState` when you wire real data. -->
    <div class="mb-8 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-default p-3">
      <span class="text-xs text-muted">Preview state</span>
      <USelect v-model="demoState" :items="DEMO_STATES" size="xs" class="w-44" />
    </div>

    <UiPageHeader title="Dashboard" description="How your sales are doing.">
      <template #actions>
        <USelect v-model="range" :items="RANGES" icon="i-lucide-calendar" class="w-44" />
      </template>
    </UiPageHeader>

    <!-- Loading -->
    <div v-if="demoState === 'loading'" class="space-y-8">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <USkeleton v-for="card in 5" :key="card" class="h-28 w-full" />
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <USkeleton class="aspect-video w-full" />
        <USkeleton class="aspect-video w-full" />
      </div>
    </div>

    <!-- Empty: nothing uploaded yet -->
    <UiEmptyState
      v-else-if="demoState === 'empty'"
      icon="i-lucide-chart-column"
      title="Nothing to show yet"
      description="Add a data set and your sales will appear here within a few seconds."
    >
      <template #action>
        <UButton to="/datasets/new" icon="i-lucide-plus">
          Add data set
        </UButton>
      </template>
    </UiEmptyState>

    <div v-else class="space-y-8">
      <!--
        Not enough history. We still show the totals, because they are true.
        We do not show trends, because eight days cannot support one.
      -->
      <UAlert
        v-if="demoState === 'thin'"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="Not enough history for trends yet"
        description="This data set covers 8 days. Weekly patterns need at least four weeks before they mean anything, so the totals below are shown without comparisons. Add more history and the trends appear automatically."
      />

      <!-- Five metrics. Comparisons disappear when there is nothing to compare to. -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiMetricCard
          label="Total revenue"
          :value="formatMoney(DEMO_TOTALS.revenue)"
          :change="demoState === 'thin' ? undefined : DEMO_TOTALS.revenueChange"
          change-label="against the previous period"
        />
        <UiMetricCard
          label="Orders"
          :value="formatCount(DEMO_TOTALS.orders)"
          :change="demoState === 'thin' ? undefined : DEMO_TOTALS.ordersChange"
          change-label="against the previous period"
        />
        <UiMetricCard
          label="Average order"
          :value="formatMoney(DEMO_TOTALS.averageOrder)"
          :change="demoState === 'thin' ? undefined : DEMO_TOTALS.averageOrderChange"
          change-label="against the previous period"
        />
        <UiMetricCard label="Best seller" :value="DEMO_TOTALS.bestSeller" />
        <UiMetricCard label="Worst seller" :value="DEMO_TOTALS.worstSeller" />
      </div>

      <!-- CHART AREAS. Keep the box, put your chart inside it. -->
      <div class="grid gap-4 lg:grid-cols-2">
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              Revenue by day of week
            </h2>
            <p class="mt-1 text-sm text-muted">
              Which days actually earn their keep.
            </p>
          </template>

          <div class="flex aspect-video items-center justify-center rounded-md border border-dashed border-default">
            <div class="p-4 text-center">
              <UIcon name="i-lucide-chart-column" class="size-6 text-muted" />
              <p class="mt-2 text-sm text-muted">
                M3: your chart goes here
              </p>
              <p class="text-xs text-muted">
                Wrap it in ClientOnly
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              Revenue over time
            </h2>
            <p class="mt-1 text-sm text-muted">
              The shape of the period, day by day.
            </p>
          </template>

          <div class="flex aspect-video items-center justify-center rounded-md border border-dashed border-default">
            <div class="p-4 text-center">
              <UIcon name="i-lucide-chart-line" class="size-6 text-muted" />
              <p class="mt-2 text-sm text-muted">
                M3: your chart goes here
              </p>
              <p class="text-xs text-muted">
                Wrap it in ClientOnly
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Best and worst items -->
      <div>
        <h2 class="text-base font-semibold">
          Every item, best to worst
        </h2>
        <p class="mt-1 mb-4 text-sm text-muted">
          Sorted by how much each one sold.
        </p>

        <UTable :data="DEMO_ITEMS" :columns="itemColumns">
          <template #itemName-cell="{ row }">
            <span class="font-medium">{{ row.original.itemName }}</span>
          </template>

          <template #category-cell="{ row }">
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ row.original.category }}
            </UBadge>
          </template>

          <template #quantity-cell="{ row }">
            {{ formatCount(row.original.quantity) }}
          </template>

          <template #revenue-cell="{ row }">
            {{ formatMoney(row.original.revenue) }}
          </template>

          <template #changePercent-cell="{ row }">
            <UiChangeIndicator v-if="demoState !== 'thin'" :value="row.original.changePercent" />
            <span v-else class="text-sm text-muted">—</span>
          </template>
        </UTable>
      </div>
    </div>
  </div>
</template>
