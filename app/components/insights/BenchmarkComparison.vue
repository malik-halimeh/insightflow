<script setup lang="ts">
import { formatCount, formatPercentChange } from '#shared/format'
import type { Dataset, Recommendation } from '#shared/schemas'
import type { Benchmark } from '#shared/schemas/benchmark'

const props = defineProps<{
  recommendation: Recommendation
}>()

const {
  data: datasets,
  status: datasetsStatus,
  error: datasetsError
} = await useFetch<Dataset[]>('/api/datasets', {
  key: 'benchmark-comparison-datasets',
  default: () => []
})

const {
  data: benchmarks,
  status: benchmarksStatus,
  error: benchmarksError
} = await useFetch<Benchmark[]>('/api/benchmarks', {
  key: 'benchmark-comparison-benchmarks',
  default: () => []
})

const dataset = computed(() => datasets.value.find(
  item => item.id === props.recommendation.datasetId
) ?? null)

const benchmark = computed(() => {
  const businessType = dataset.value?.businessType
  const dimensionValue = props.recommendation.dimensionValue
  const operator = props.recommendation.operator

  if (
    !businessType
    || props.recommendation.dimension !== 'dayOfWeek'
    || !dimensionValue
    || (operator !== 'above_average_by' && operator !== 'below_average_by')
  ) {
    return null
  }

  return benchmarks.value.find(item =>
    item.businessType === businessType
    && item.metric === props.recommendation.metric
    && item.dimension === props.recommendation.dimension
    && item.dimensionValue === dimensionValue
    && item.operator === operator
  ) ?? null
})

const loading = computed(() =>
  datasetsStatus.value === 'pending' || benchmarksStatus.value === 'pending'
)

const unavailable = computed(() =>
  Boolean(datasetsError.value) || Boolean(benchmarksError.value) || !benchmark.value
)

const difference = computed(() =>
  benchmark.value
    ? props.recommendation.changePercent - benchmark.value.aggregateValue
    : null
)

const differenceFormatter = new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero'
})

function formatPercentagePoints(value: number): string {
  return `${differenceFormatter.format(value)} pts`
}

function differenceDirection(value: number): string {
  if (value > 0) return 'above the anonymous benchmark'
  if (value < 0) return 'below the anonymous benchmark'
  return 'the same as the anonymous benchmark'
}
</script>

<template>
  <div
    class="border border-default bg-elevated p-4"
    :aria-labelledby="`benchmark-comparison-${recommendation.id}`"
  >
    <h3
      :id="`benchmark-comparison-${recommendation.id}`"
      class="text-base font-semibold"
    >
      Anonymous benchmark
    </h3>

    <div v-if="loading" class="mt-4 space-y-2" role="status">
      <USkeleton class="h-4 w-full" />
      <USkeleton class="h-4 w-full" />
      <span class="text-xs text-muted">Loading anonymous benchmark</span>
    </div>

    <div v-else-if="unavailable" class="mt-2">
      <p class="text-sm">
        Anonymous benchmark not available yet
      </p>
      <p class="mt-2 text-xs text-muted">
        There is not enough comparable anonymous published data for this recommendation.
      </p>
    </div>

    <div v-else-if="benchmark && difference !== null" class="mt-4 space-y-4">
      <p class="text-xs text-muted">
        {{ benchmark.dimensionValue }} · {{ benchmark.businessType }}
      </p>

      <dl class="grid grid-cols-2 gap-2 text-sm">
        <dt>Your pattern</dt>
        <dd>{{ formatPercentChange(recommendation.changePercent) }}</dd>

        <dt>Anonymous benchmark</dt>
        <dd>{{ formatPercentChange(benchmark.aggregateValue) }}</dd>

        <dt>Difference</dt>
        <dd>
          {{ formatPercentagePoints(difference) }} — {{ differenceDirection(difference) }}
        </dd>
      </dl>

      <p class="text-xs text-muted">
        Based on {{ formatCount(benchmark.contributorCount) }} anonymous contributors
      </p>
    </div>
  </div>
</template>
