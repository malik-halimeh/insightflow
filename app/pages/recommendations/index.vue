<script setup lang="ts">
import type { Recommendation } from '#shared/schemas'

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

useSeoMeta({ title: 'Recommendations — InsightFlow' })

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
      description="What your sales data is telling you."
    >
      <template #actions>
        <UButton
          to="/recommendations/rules"
          color="neutral"
          variant="subtle"
          icon="i-lucide-sliders-horizontal"
        >
          Rules
        </UButton>
      </template>
    </UiPageHeader>

    <div
      v-if="status === 'pending'"
      class="space-y-4"
    >
      <USkeleton
        v-for="card in 3"
        :key="card"
        class="h-40 w-full"
      />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Recommendations could not be loaded"
      description="Check your connection and try again."
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

    <UiEmptyState
      v-else-if="recommendations.length === 0"
      icon="i-lucide-lightbulb"
      title="No recommendations yet"
      description="InsightFlow looks for patterns using rules you control. Set up a rule and any matching findings appear here."
    >
      <template #action>
        <UButton
          to="/recommendations/rules"
          icon="i-lucide-sliders-horizontal"
        >
          Set up a rule
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
