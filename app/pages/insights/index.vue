<script setup lang="ts">
import type { PublishedInsight } from '#shared/schemas'

useSeoMeta({
  title: 'Insight feed — InsightFlow',
  description: 'Plain-language sales findings shared by small businesses.'
})

const { data: insights, status, error } = await useFetch('/api/insights', {
  default: (): PublishedInsight[] => []
})
</script>

<template>
  <div>
    <UiPageHeader
      title="Insight feed"
      description="Sales findings shared by small businesses."
    />

    <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2">
      <USkeleton class="h-48 w-full" />
      <USkeleton class="h-48 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      title="The insight feed could not be loaded"
      description="Please refresh the page and try again."
    />

    <UiEmptyState
      v-else-if="insights.length === 0"
      icon="i-lucide-radio"
      title="No insights published yet"
      description="Published sales findings will appear here."
    />

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <InsightsInsightCard
        v-for="insight in insights"
        :key="insight.id"
        :insight="insight"
      />
    </div>
  </div>
</template>
