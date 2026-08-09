<script setup lang="ts">
import type { PublishedInsight } from '#shared/schemas'

useSeoMeta({
  title: 'Insight feed | InsightFlow',
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
      description="What small businesses learned from their own sales."
    />

    <!--
      States the rule rather than leaving a reader to notice the gap. Without this
      line the missing figures read as something the page forgot; with it, they read
      as the point.
    -->
    <div class="-mt-4 mb-8 flex max-w-2xl items-start gap-3 rounded-xl border border-primary/20 bg-primary/8 p-4 text-sm text-muted">
      <UIcon name="i-lucide-shield-check" class="mt-0.5 size-5 shrink-0 text-primary-700 dark:text-primary-300" />
      <p>Everyone here shares what changed, never what they earn. You will not find anyone's takings on this page.</p>
    </div>

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

    <div v-else class="grid gap-5 sm:grid-cols-2">
      <InsightsInsightCard
        v-for="insight in insights"
        :key="insight.id"
        :insight="insight"
      />
    </div>
  </div>
</template>
