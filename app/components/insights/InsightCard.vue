<script setup lang="ts">
import { formatPercentChange } from '#shared/format'
import type { PublishedInsight } from '#shared/schemas'

defineProps<{
  insight: PublishedInsight
}>()
</script>

<template>
  <UCard class="group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
    <div class="absolute inset-y-0 left-0 w-1 bg-primary" />
    <InsightsInsightMeta
      :display-name="insight.displayName"
      :business-type="insight.businessType"
      :published-at="insight.publishedAt"
    />

    <p class="mt-5 text-3xl font-semibold tracking-tight">
      {{ formatPercentChange(insight.metricValue) }}
    </p>

    <h2 class="mt-2 text-lg font-semibold">
      {{ insight.metricLabel }}
    </h2>

    <p class="mt-4 text-sm leading-6 text-muted">
      {{ insight.caption }}
    </p>

    <p v-if="insight.hideAbsoluteNumbers" class="mt-4 text-xs text-muted">
      Actual figures are hidden. Only the percentage change is shared.
    </p>

    <p v-else class="mt-4 text-xs text-muted">
      This published insight includes a percentage change only.
    </p>

    <template #footer>
      <NuxtLink :to="`/insights/${insight.slug}`" class="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
        Read insight
        <UIcon name="i-lucide-arrow-right" class="size-4 transition group-hover:translate-x-0.5" />
      </NuxtLink>
    </template>
  </UCard>
</template>
