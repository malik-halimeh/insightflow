<script setup lang="ts">
import type { Recommendation } from '#shared/schemas'

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

const {
  data: recommendations,
  status,
  error,
  refresh
} = await useFetch('/api/recommendations', {
  default: (): Recommendation[] => []
})
</script>

<template>
  <div class="space-y-8">
    <UiPageHeader
      title="Recommendations"
      description="Advice generated from patterns in your sales data."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="subtle"
          to="/recommendations/rules"
        >
          Manage rules
        </UButton>
      </template>
    </UiPageHeader>

    <div
      v-if="status === 'pending'"
      class="grid gap-4"
    >
      <USkeleton class="h-40 w-full" />
      <USkeleton class="h-40 w-full" />
      <USkeleton class="h-40 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      title="Recommendations could not be loaded"
      description="Check your connection and try again."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="subtle"
          @click="() => refresh()"
        >
          Try again
        </UButton>
      </template>
    </UAlert>

    <UiEmptyState
      v-else-if="recommendations.length === 0"
      title="No recommendations yet"
      description="Add sales data and rules so InsightFlow can find useful patterns."
    >
      <template #action>
        <UButton to="/recommendations/rules">
          Create a rule
        </UButton>
      </template>
    </UiEmptyState>

    <section
      v-else
      class="space-y-4"
    >
      <h2 class="text-base font-semibold">
        Advice for your business
      </h2>

      <div class="grid gap-4 lg:grid-cols-2">
        <RecommendationCard
          v-for="recommendation in recommendations"
          :key="recommendation.id"
          :recommendation="recommendation"
        />
      </div>
    </section>
  </div>
</template>