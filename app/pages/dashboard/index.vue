<!--
  OWNER: M3 (dashboard and analytics)

  WHAT THIS IS
  The dashboard, reading real figures from /api/analytics. The aggregation behind
  it is in server/api/analytics/[datasetId]/summary.get.ts.

  THE STATE THAT MATTERS
  "Not enough history". Below four weeks of trading days, every comparison is
  hidden and the page says so. A weekday pattern drawn over eight days is not a
  small inaccuracy, it is a confident line through noise, and an owner would order
  stock against it. The headline card and the publish section both depend on
  `busiestDay`/`quietestDay`, so they are hidden along with every other comparison
  when there is not enough history to trust them.

  WHAT NOT TO CHANGE
  - The four-week rule. Lower it and the product starts inventing patterns.
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

const {
  data: datasets,
  status: datasetsStatus,
  error: datasetsError
} = await useFetch('/api/analytics/datasets', {
  default: (): DatasetSummary[] => []
})

// The list above is awaited, so it is already resolved here. Seed the selection
// from it directly rather than through a watcher: a watcher would set the id
// before the request below is registered, and that request would then sit waiting
// for a change that had already happened.
const selectedId = ref(datasets.value[0]?.id ?? '')

const {
  data: summary,
  status: summaryStatus,
  error: summaryError
} = await useFetch<AnalyticsSummary>(
  () => `/api/analytics/${selectedId.value}/summary`,
  { immediate: selectedId.value !== '', watch: [selectedId] }
)

const failed = computed(() => Boolean(datasetsError.value || summaryError.value))

const loading = computed(() =>
  !failed.value
  && selectedId.value !== ''
  && (datasetsStatus.value === 'pending' || summaryStatus.value === 'pending' || !summary.value)
)

const enoughHistory = computed(() => (summary.value?.activeDays ?? 0) >= MINIMUM_DAYS_FOR_TRENDS)

/**
 * The one finding a busy owner reads first: how much busier the best trading day
 * is than the quietest one. Both come straight out of the analytics summary, so
 * this never recomputes a comparison the server has already made.
 */
const headline = computed(() => {
  const busiestDay = summary.value?.busiestDay
  const quietestDay = summary.value?.quietestDay
  if (!busiestDay || !quietestDay) return null

  const busiestShort = `${busiestDay.day.slice(0, 3)}s`
  const quietestShort = `${quietestDay.day.slice(0, 3)}s`

  return {
    changePercent: busiestDay.changePercent,
    sentence: `${busiestShort} are ${Math.round(busiestDay.changePercent)}% busier than ${quietestShort} here.`
  }
})
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

    <!--
      A failed request must not render as an empty screen. "Nothing to show yet"
      sends an owner off to upload data they have already uploaded.
    -->
    <UAlert
      v-if="failed"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="We could not load your figures"
      description="Your data is safe. Refresh the page to try again, and if it keeps happening it is a problem on our side rather than with your account."
    />

    <!-- Nothing uploaded yet -->
    <UiEmptyState
      v-else-if="datasetsStatus !== 'pending' && datasets.length === 0"
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
      <USkeleton class="h-32 w-full" />
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <USkeleton v-for="card in 4" :key="card" class="h-28 w-full" />
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

      <DashboardHeadlineInsight
        v-if="enoughHistory && headline"
        :change-percent="headline.changePercent"
        :sentence="headline.sentence"
        :row-count="summary.dataset.rowCount"
        :period-start="summary.dataset.periodStart"
        :period-end="summary.dataset.periodEnd"
      />

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiMetricCard
          label="Total revenue"
          :value="formatMoney(summary.kpis.totalRevenue)"
          :change="enoughHistory ? summary.kpis.revenueChangePercent : undefined"
          change-label="2nd half vs 1st half"
        />
        <UiMetricCard label="Units sold" :value="formatCount(summary.kpis.totalUnits)" />
        <UiMetricCard label="Avg. daily revenue" :value="formatMoney(summary.kpis.avgDailyRevenue)" />
        <UiMetricCard label="Menu items tracked" :value="formatCount(summary.kpis.distinctItems)" />
      </div>

      <DashboardRevenueTrendChart
        :points="summary.revenueTrend"
        :change-percent="enoughHistory ? summary.kpis.revenueChangePercent : undefined"
      />

      <div class="grid gap-4 lg:grid-cols-2">
        <DashboardDayOfWeekChart :days="summary.dayOfWeek" :show-comparison="enoughHistory" />
        <DashboardCategoryBreakdown :categories="summary.categories" />
      </div>

      <DashboardTopItemsTable :items="summary.topItems" />

      <DashboardPublishHeadline
        v-if="enoughHistory && headline"
        :headline="headline.sentence"
        :change-percent="headline.changePercent"
        :business-type="summary.dataset.businessType"
      />
    </div>
  </div>
</template>
