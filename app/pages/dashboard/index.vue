<!--
  OWNER: M3 (dashboard and analytics)

  WHAT THIS IS
  The dashboard, reading real figures from /api/analytics. The aggregation behind
  it is in server/api/analytics/[datasetId]/summary.get.ts.

  THE STATE THAT MATTERS
  "Not enough history". Below four weeks of trading days, every comparison is
  hidden and the page says so. A weekday pattern drawn over eight days is not a
  small inaccuracy, it is a confident line through noise, and an owner would order
  stock against it.

  WHAT NOT TO CHANGE
  - The four-week rule. Lower it and the product starts inventing patterns.
  - Best seller and worst seller carry no comparison. A single name has nothing to
    be compared against.
  - Money and counts go through #shared/format. Never format a figure by hand.
  - The class names come from docs/DESIGN-SYSTEM.md.
-->

<script setup lang="ts">
import { formatCount, formatMoney } from '#shared/format'
import type { AnalyticsSummary, DatasetSummary } from '#shared/types/analytics'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Dashboard — InsightFlow' })

/** Four weeks of trading days. Below this, comparisons are hidden rather than guessed. */
const MINIMUM_DAYS_FOR_TRENDS = 28

const { data: datasets, status: datasetsStatus } = await useFetch('/api/analytics/datasets', {
  default: (): DatasetSummary[] => []
})

const selectedId = ref('')

watch(datasets, (list) => {
  if (!selectedId.value && list.length) selectedId.value = list[0]!.id
}, { immediate: true })

const { data: summary, status: summaryStatus } = await useFetch<AnalyticsSummary>(
  () => `/api/analytics/${selectedId.value}/summary`,
  { immediate: false, watch: [selectedId] }
)

const loading = computed(() =>
  datasetsStatus.value === 'pending' || summaryStatus.value === 'pending' || !summary.value
)

const enoughHistory = computed(() => (summary.value?.activeDays ?? 0) >= MINIMUM_DAYS_FOR_TRENDS)

const bestSeller = computed(() => summary.value?.topItems[0]?.itemName ?? '—')
const worstSeller = computed(() => summary.value?.topItems.at(-1)?.itemName ?? '—')
</script>

<template>
  <div>
    <UiPageHeader title="Dashboard" description="How your sales are doing.">
      <template #actions>
        <DashboardDatasetSelector
          v-if="datasets.length > 0"
          v-model="selectedId"
          :datasets="datasets"
        />
      </template>
    </UiPageHeader>

    <!-- Nothing uploaded yet -->
    <UiEmptyState
      v-if="datasetsStatus !== 'pending' && datasets.length === 0"
      icon="i-lucide-chart-column"
      title="Nothing to show yet"
      description="Add a data set and your sales appear here within a few seconds."
    >
      <template #action>
        <UButton to="/datasets/new" icon="i-lucide-plus">
          Add data set
        </UButton>
      </template>
    </UiEmptyState>

    <!-- Loading -->
    <div v-else-if="loading" class="space-y-8">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <USkeleton v-for="card in 5" :key="card" class="h-28 w-full" />
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <USkeleton class="h-64 w-full" />
        <USkeleton class="h-64 w-full" />
      </div>
    </div>

    <div v-else-if="summary" class="space-y-8">
      <!--
        Totals are true whatever the period length, so they stay. Comparisons need
        four weeks behind them, so they go.
      -->
      <UAlert
        v-if="!enoughHistory"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="Not enough history for trends yet"
        :description="`This data set covers ${summary.activeDays} trading ${summary.activeDays === 1 ? 'day' : 'days'}. Weekly patterns need at least four weeks before they mean anything, so the totals below are shown without comparisons. Add more history and the trends appear on their own.`"
      />

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiMetricCard
          label="Total revenue"
          :value="formatMoney(summary.kpis.totalRevenue)"
          :change="enoughHistory ? summary.kpis.revenueChangePercent : undefined"
          change-label="second half against the first"
        />
        <UiMetricCard label="Items sold" :value="formatCount(summary.kpis.totalUnits)" />
        <UiMetricCard label="Average day" :value="formatMoney(summary.kpis.avgDailyRevenue)" />
        <UiMetricCard label="Best seller" :value="bestSeller" />
        <UiMetricCard label="Worst seller" :value="worstSeller" />
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <DashboardRevenueTrendChart :points="summary.revenueTrend" />
        <DashboardDayOfWeekChart :days="summary.dayOfWeek" :show-comparison="enoughHistory" />
      </div>

      <DashboardCategoryBreakdown :categories="summary.categories" />

      <DashboardTopItemsTable :items="summary.topItems" />
    </div>
  </div>
</template>
