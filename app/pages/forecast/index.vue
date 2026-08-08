<!--
  OWNER: M3 (dashboard and analytics)

  WHAT THIS IS
  The forecast screen. Predicts the next `horizonDays` of revenue with a weighted
  moving average over the last four same-weekdays — built and served by M1's
  engine at GET /api/forecast/:datasetId. This page only renders what that
  endpoint returns; the maths lives in server/utils/forecast.ts, which is not
  this file's concern.

  THE STATE THAT MATTERS
  `insufficientData`. Below four weeks of trading days there is nothing honest to
  predict from, so the screen says so instead of drawing a line through noise —
  the same rule the dashboard applies to its own comparisons, and for the same
  reason: a confident line through a fortnight of trading is something an owner
  would order stock against.

  WHAT NOT TO CHANGE
  - `<UiForecastBandChart>` is M1's shared chart component
    (app/components/ui/ForecastBandChart.vue). It draws the band; this page only
    ever passes data into it and never opens the file.
  - Money goes through #shared/format. Never format a figure by hand.
  - Accuracy (`meanAbsolutePercentError`) is a magnitude, not a trend — it has no
    sign to preserve — so it is never passed through `formatPercentChange`, which
    always signs its output.
  - The class names come from docs/DESIGN-SYSTEM.md.

  DEPENDENCY NOTE
  This page is written against the published contract in
  shared/types/forecast.ts (`ForecastSummary`) and calls the endpoint and the
  chart component M1 owns for Phase 2: GET /api/forecast/:datasetId and
  ForecastBandChart.vue. Per docs/M1-PHASE-2.md, M3 builds the screen against
  that written shape before the implementation lands — so until both are merged,
  the fetch has nothing to answer it and the chart import has nothing to render
  against. That is the expected state of an in-progress integration, not a bug
  in this file.
-->

<script setup lang="ts">
import { formatMoney } from '#shared/format'
import type { ForecastSummary } from '#shared/types/forecast'
import type { DatasetSummary } from '#shared/types/analytics'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Forecast | InsightFlow' })

const {
  data: datasets,
  status: datasetsStatus,
  error: datasetsError
} = await useFetch('/api/analytics/datasets', {
  default: (): DatasetSummary[] => []
})

// Seeded directly from the already-resolved list above, for the same reason the
// dashboard does it this way: a watcher would set the id after this request is
// registered, leaving it waiting on a change that had already happened.
const selectedId = ref(datasets.value[0]?.id ?? '')

const {
  data: forecast,
  status: forecastStatus,
  error: forecastError
} = await useFetch<ForecastSummary>(
  () => `/api/forecast/${selectedId.value}`,
  { immediate: selectedId.value !== '', watch: [selectedId] }
)

const failed = computed(() => Boolean(datasetsError.value || forecastError.value))

const loading = computed(() =>
  !failed.value
  && selectedId.value !== ''
  && (datasetsStatus.value === 'pending' || forecastStatus.value === 'pending' || !forecast.value)
)

/** "±12.4%" for the metric card. Null while there is nothing measured yet. */
const accuracyValue = computed(() => {
  const accuracy = forecast.value?.accuracy
  return accuracy ? `±${accuracy.meanAbsolutePercentError.toFixed(1)}%` : null
})

/** The longer sentence for the chart caption, naming how many days it was measured over. */
const accuracyCaption = computed(() => {
  const accuracy = forecast.value?.accuracy
  if (!accuracy) return null
  const days = accuracy.daysMeasured === 1 ? 'day' : 'days'
  return `Typically off by ${accuracy.meanAbsolutePercentError.toFixed(1)}%, measured over the last ${accuracy.daysMeasured} ${days}`
})

const nextDayRevenue = computed(() =>
  forecast.value?.points[0] ? formatMoney(forecast.value.points[0].predicted) : 'Not available'
)
</script>

<template>
  <div>
    <UiPageHeader title="Forecast" description="What next week is likely to look like.">
      <template #actions>
        <DashboardDatasetSelector
          v-if="datasets.length > 0"
          v-model="selectedId"
          :datasets="datasets"
        />
      </template>
    </UiPageHeader>

    <!--
      A failed request must not render as an empty screen. "Nothing to forecast"
      sends an owner off to upload data they have already uploaded.
    -->
    <UAlert
      v-if="failed"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="We could not load your forecast"
      description="Your data is safe. Refresh the page to try again, and if it keeps happening it is a problem on our side rather than with your account."
    />

    <!-- Nothing uploaded yet -->
    <UiEmptyState
      v-else-if="datasetsStatus !== 'pending' && datasets.length === 0"
      icon="i-lucide-trending-up"
      title="Nothing to forecast yet"
      description="Add a data set and, once it has a month of history behind it, a forecast appears here."
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
        <USkeleton v-for="card in 3" :key="card" class="h-28 w-full" />
      </div>
      <USkeleton class="h-80 w-full" />
    </div>

    <div v-else-if="forecast" class="space-y-8">
      <!--
        Too little history to predict from. Points and accuracy are empty and
        null respectively when this is set, so nothing below this alert renders.
      -->
      <UAlert
        v-if="forecast.insufficientData"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="Not enough history to forecast yet"
        :description="`This data set covers ${forecast.activeDays} trading ${forecast.activeDays === 1 ? 'day' : 'days'}. A forecast needs at least ${forecast.requiredDays} before a weekday pattern is reliable enough to predict from. Add more history and the forecast appears on its own.`"
      />

      <template v-else>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <UiMetricCard
            label="Forecast horizon"
            :value="`${forecast.horizonDays} ${forecast.horizonDays === 1 ? 'day' : 'days'} ahead`"
          />
          <UiMetricCard
            v-if="accuracyValue"
            label="Typical accuracy"
            :value="accuracyValue"
          />
          <UiMetricCard
            label="Predicted revenue, next day"
            :value="nextDayRevenue"
          />
        </div>

        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-base font-semibold">
                Revenue: recent history and forecast
              </h2>
              <p v-if="accuracyCaption" class="text-xs text-muted">
                {{ accuracyCaption }}
              </p>
            </div>
          </template>

          <UiForecastBandChart :actuals="forecast.actuals" :points="forecast.points" />
        </UCard>
      </template>
    </div>
  </div>
</template>
