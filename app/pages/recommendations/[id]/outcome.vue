<script setup lang="ts">
import { formatCount, formatMoney, formatPercentChange } from '#shared/format'
import type {
  Dimension,
  Metric,
  Outcome,
  OutcomeDetailResponse,
  OutcomeStatus
} from '#shared/schemas'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Recommendation outcome — InsightFlow' })

const route = useRoute()
const recommendationId = computed(() => String(route.params.id))
const {
  data: detail,
  status,
  error,
  refresh
} = await useFetch<OutcomeDetailResponse>(
  () => `/api/outcomes/${recommendationId.value}`
)

const outcome = computed(() => detail.value?.outcome ?? null)

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

function metricLabel(metric: Metric): string {
  if (metric === 'revenue') return 'Revenue'
  if (metric === 'quantity') return 'Units sold'
  return 'Orders'
}

function dimensionLabel(dimension: Dimension): string {
  if (dimension === 'dayOfWeek') return 'Day of week'
  if (dimension === 'item') return 'Item'
  if (dimension === 'category') return 'Category'
  return 'Hour'
}

function metricValue(value: number, metric: Metric): string {
  return metric === 'revenue' ? formatMoney(value) : formatCount(value)
}

function afterMetricValue(result: Outcome): string {
  return result.afterValue === null
    ? 'Not available'
    : metricValue(result.afterValue, result.recommendation.metric)
}

function verdictLabel(status: OutcomeStatus): string {
  if (status === 'improved') return 'Improved'
  if (status === 'no_clear_effect') return 'No clear effect'
  if (status === 'worsened') return 'Worsened'
  return 'Waiting for a result'
}

function verdictDescription(result: Outcome): string {
  if (result.status === 'pending') {
    return 'The equal after period is not ready yet.'
  }

  if (result.status === 'improved') {
    return 'The watched measure moved in the direction expected after this advice was followed.'
  }

  if (result.status === 'worsened') {
    return 'The watched measure moved in the opposite direction from what was expected.'
  }

  return 'The measured change stayed within the inclusive ±5% no-clear-effect range.'
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Outcome"
      :description="outcome?.recommendation.title ?? 'The observed result before and after following advice.'"
    >
      <template #actions>
        <UButton
          to="/recommendations"
          color="neutral"
          variant="subtle"
          icon="i-lucide-arrow-left"
        >
          Recommendations
        </UButton>
      </template>
    </UiPageHeader>

    <div v-if="status === 'pending'" class="space-y-8">
      <USkeleton class="h-40 w-full" />
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <USkeleton v-for="card in 3" :key="card" class="h-28 w-full" />
      </div>
      <USkeleton class="h-48 w-full" />
    </div>

    <UAlert
      v-else-if="error || !detail || !outcome"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="This outcome could not be loaded"
      description="Return to recommendations or try loading the outcome again."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-rotate-ccw"
          @click="() => refresh()"
        >
          Try again
        </UButton>
      </template>
    </UAlert>

    <div v-else class="space-y-8">
      <UCard>
        <template #header>
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold">
                {{ outcome.recommendation.title }}
              </h2>
              <p class="mt-2 text-xs text-muted">
                {{ metricLabel(outcome.recommendation.metric) }} ·
                {{ dimensionLabel(outcome.recommendation.dimension) }}:
                {{ outcome.recommendation.dimensionValue }} ·
                Expected to go {{ outcome.recommendation.expectedDirection }}
              </p>
            </div>

            <UBadge color="neutral" variant="subtle">
              {{ verdictLabel(outcome.status) }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm">
            {{ outcome.recommendation.body }}
          </p>

          <div class="flex gap-4 bg-elevated p-4">
            <UIcon name="i-lucide-arrow-right" class="size-4 shrink-0 text-muted" />
            <p class="text-sm font-semibold">
              {{ outcome.recommendation.action }}
            </p>
          </div>

          <p class="text-sm">
            Followed on <span class="font-semibold">{{ shortDate(outcome.followedDate) }}</span>
          </p>

          <p v-if="outcome.note" class="text-sm text-muted">
            Your note: {{ outcome.note }}
          </p>
        </div>
      </UCard>

      <template v-if="outcome.status === 'pending' && detail.readiness">
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-calendar-days"
          title="Waiting for enough after-period data"
          :description="`The result needs ${detail.readiness.calendarDaysRequired} calendar days and sales on at least ${detail.readiness.distinctSalesDatesRequired} different dates.`"
        />

        <div class="grid gap-4 sm:grid-cols-2">
          <UiMetricCard
            label="Calendar time"
            :value="`${formatCount(detail.readiness.calendarDaysElapsed)} of ${formatCount(detail.readiness.calendarDaysRequired)} days`"
          />
          <UiMetricCard
            label="Sales dates recorded"
            :value="`${formatCount(detail.readiness.distinctSalesDates)} of ${formatCount(detail.readiness.distinctSalesDatesRequired)}`"
          />
        </div>
      </template>

      <template v-else>
        <UAlert
          color="neutral"
          variant="subtle"
          icon="i-lucide-lightbulb"
          :title="verdictLabel(outcome.status)"
          :description="verdictDescription(outcome)"
        />

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <UiMetricCard
            label="Two weeks before"
            :value="metricValue(outcome.beforeValue, outcome.recommendation.metric)"
          />
          <UiMetricCard
            label="Two weeks after"
            :value="afterMetricValue(outcome)"
          />
          <UiMetricCard
            label="Observed change"
            :value="outcome.changePercent === null ? 'Not available' : formatPercentChange(outcome.changePercent)"
          />
        </div>

        <p v-if="outcome.changePercent === null" class="text-sm text-muted">
          A percentage is not available because the before value was zero. The absolute values above still show the observed comparison.
        </p>

        <UAlert
          v-if="outcome.hasMissingSalesDates"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Some after-period sales dates are missing"
          :description="`${formatCount(outcome.afterWindow?.missingSalesDates ?? 0)} calendar dates have no sales rows. The result is shown, but read it with that gap in mind.`"
        />
      </template>

      <section class="space-y-4">
        <h2 class="text-base font-semibold">
          Equal comparison windows
        </h2>

        <div class="grid gap-4 sm:grid-cols-2">
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">
                Before
              </h3>
            </template>
            <div class="space-y-2 text-sm">
              <p>
                {{ shortDate(outcome.beforeWindow.periodStart) }} to
                {{ shortDate(outcome.beforeWindow.periodEnd) }}
              </p>
              <p class="text-muted">
                {{ formatCount(outcome.beforeWindow.sourceRowCount) }} source rows across
                {{ formatCount(outcome.beforeWindow.distinctSalesDates) }} sales dates.
              </p>
              <p class="text-xs text-muted">
                Upload reference: {{ outcome.beforeWindow.datasetVersionId ?? 'Not recorded' }}
              </p>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">
                After
              </h3>
            </template>
            <div v-if="outcome.afterWindow" class="space-y-2 text-sm">
              <p>
                {{ shortDate(outcome.afterWindow.periodStart) }} to
                {{ shortDate(outcome.afterWindow.periodEnd) }}
              </p>
              <p class="text-muted">
                {{ formatCount(outcome.afterWindow.sourceRowCount) }} source rows across
                {{ formatCount(outcome.afterWindow.distinctSalesDates) }} sales dates.
              </p>
              <p class="text-xs text-muted">
                Upload reference: {{ outcome.afterWindow.datasetVersionId ?? 'Not recorded' }}
              </p>
            </div>
            <div v-else-if="detail.readiness" class="space-y-2 text-sm">
              <p>
                {{ shortDate(detail.readiness.afterPeriodStart) }} to
                {{ shortDate(detail.readiness.afterPeriodEnd) }}
              </p>
              <p class="text-muted">
                This window will be frozen when both readiness conditions are met.
              </p>
            </div>
          </UCard>
        </div>
      </section>

      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="This is an observed comparison"
        description="It shows what changed in the equal periods before and after the advice was followed. It does not establish that the advice caused the change."
      />
    </div>
  </div>
</template>
