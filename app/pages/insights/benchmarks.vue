<script setup lang="ts">
import { formatCount, formatPercentChange } from '#shared/format'
import type {
  Benchmark,
  BusinessType,
  Dimension,
  Metric,
  RuleOperator
} from '#shared/schemas'

const benchmarksEnabled = useRuntimeConfig().public.benchmarksEnabled

if (!benchmarksEnabled) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
}

useSeoMeta({
  title: 'Anonymous benchmarks | InsightFlow',
  description: 'Anonymous aggregate comparisons from insights published by small businesses.'
})

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurant: 'Restaurant',
  retail: 'Shop',
  gym: 'Gym'
}

const METRIC_LABELS: Record<Metric, string> = {
  revenue: 'Revenue',
  quantity: 'Units sold',
  orders: 'Orders'
}

const DIMENSION_LABELS: Record<Dimension, string> = {
  dayOfWeek: 'Day of week',
  item: 'Item',
  category: 'Category',
  hour: 'Hour'
}

const OPERATOR_LABELS: Record<RuleOperator, string> = {
  above_average_by: 'Above average',
  below_average_by: 'Below average',
  unsold_for_days: 'Unsold for days'
}

const { data: benchmarks, status, error } = await useFetch('/api/benchmarks', {
  default: (): Benchmark[] => []
})
</script>

<template>
  <div>
    <UiPageHeader
      title="Anonymous benchmarks"
      description="See how comparable published patterns look across small businesses, without seeing anyone's individual results."
    >
      <template #actions>
        <UButton to="/insights" color="neutral" variant="subtle" icon="i-lucide-arrow-left">
          Insight feed
        </UButton>
      </template>
    </UiPageHeader>

    <UAlert
      class="-mt-4 mb-8"
      color="info"
      variant="subtle"
      icon="i-lucide-shield-check"
      title="Anonymous aggregates only"
      description="Each benchmark combines comparable published insights from several contributors. No individual business or result is shown."
    />

    <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <USkeleton class="h-56 w-full" />
      <USkeleton class="h-56 w-full" />
      <USkeleton class="h-56 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      title="Anonymous benchmarks could not be loaded"
      description="This feature may not be available right now. Please refresh the page and try again."
    />

    <UiEmptyState
      v-else-if="benchmarks.length === 0"
      icon="i-lucide-chart-no-axes-combined"
      title="Not enough published data yet"
      description="Benchmarks appear once enough anonymous contributors have published comparable insights."
    >
      <template #action>
        <UButton to="/insights" color="neutral" variant="subtle">
          Read published insights
        </UButton>
      </template>
    </UiEmptyState>

    <section v-else aria-labelledby="benchmark-list-title">
      <h2 id="benchmark-list-title" class="sr-only">
        Available anonymous benchmarks
      </h2>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="benchmark in benchmarks"
          :key="`${benchmark.businessType}:${benchmark.metric}:${benchmark.dimension}:${benchmark.dimensionValue}:${benchmark.operator}`"
        >
          <UCard class="h-full">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge color="neutral" variant="subtle">
                {{ BUSINESS_TYPE_LABELS[benchmark.businessType] }}
              </UBadge>
              <UBadge color="neutral" variant="subtle">
                {{ METRIC_LABELS[benchmark.metric] }}
              </UBadge>
            </div>

            <h3 class="mt-4 text-lg font-semibold">
              {{ benchmark.dimensionValue }}
            </h3>

            <p class="mt-2 text-xs text-muted">
              {{ DIMENSION_LABELS[benchmark.dimension] }} · {{ OPERATOR_LABELS[benchmark.operator] }}
            </p>

            <p class="mt-4 text-2xl font-semibold tracking-tight">
              {{ formatPercentChange(benchmark.aggregateValue) }}
            </p>

            <p class="mt-2 text-sm text-muted">
              Average signed comparison across comparable published insights.
            </p>

            <template #footer>
              <p class="inline-flex items-center gap-2 text-xs text-muted">
                <UIcon name="i-lucide-users" class="size-4" />
                Based on {{ formatCount(benchmark.contributorCount) }} anonymous contributors
              </p>
            </template>
          </UCard>
        </article>
      </div>
    </section>
  </div>
</template>
