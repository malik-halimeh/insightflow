<script setup lang="ts">
import { formatPercentChange } from '#shared/format'
import type { PublishedInsight } from '#shared/schemas'

defineProps<{
  insight: PublishedInsight
}>()
</script>

<template>
  <UCard>
    <InsightsInsightMeta
      :display-name="insight.displayName"
      :business-type="insight.businessType"
      :published-at="insight.publishedAt"
    />

    <p class="mt-2 text-2xl font-semibold">
      {{ formatPercentChange(insight.metricValue) }}
    </p>

    <h2 class="mt-2 text-lg font-semibold">
      {{ insight.metricLabel }}
    </h2>

    <p class="mt-4 text-sm text-muted">
      {{ insight.caption }}
    </p>

    <template #footer>
      <NuxtLink :to="`/insights/${insight.slug}`" class="text-sm text-primary">
        Read insight
      </NuxtLink>
    </template>
  </UCard>
</template>
