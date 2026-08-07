<script setup lang="ts">
import type {
  PublishedInsight,
  PublishedInsightCreate,
  Recommendation
} from '#shared/schemas'

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

useSeoMeta({ title: 'Recommendations - InsightFlow' })

const {
  data: recommendations,
  status,
  error,
  refresh: refreshRecommendations
} = await useFetch('/api/recommendations', {
  default: (): Recommendation[] => []
})

const {
  data: publishedInsights,
  status: publishStatus,
  error: publishLoadError,
  refresh: refreshPublishedInsights
} = await useFetch('/api/publish', {
  default: (): PublishedInsight[] => []
})

const publishingId = ref<string | null>(null)
const unpublishingId = ref<string | null>(null)
const actionErrors = ref<Record<string, string | null>>({})

const publishedByRecommendation = computed(() => new Map(
  publishedInsights.value.flatMap(insight =>
    insight.recommendationId ? [[insight.recommendationId, insight] as const] : []
  )
))

function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const response = error as {
      statusMessage?: string
      data?: { statusMessage?: string }
    }

    return response.data?.statusMessage ?? response.statusMessage ?? fallback
  }

  return fallback
}

async function publish(input: PublishedInsightCreate) {
  publishingId.value = input.recommendationId
  actionErrors.value[input.recommendationId] = null

  try {
    const insight = await $fetch<PublishedInsight>('/api/publish', {
      method: 'POST',
      body: input
    })

    publishedInsights.value = [
      insight,
      ...publishedInsights.value.filter(item => item.id !== insight.id)
    ]
  } catch (error) {
    actionErrors.value[input.recommendationId] = messageFrom(
      error,
      'This insight could not be published. Please try again.'
    )
  } finally {
    publishingId.value = null
  }
}

async function unpublish(recommendationId: string) {
  unpublishingId.value = recommendationId
  actionErrors.value[recommendationId] = null

  try {
    await $fetch(`/api/publish/${recommendationId}`, {
      method: 'DELETE'
    })

    publishedInsights.value = publishedInsights.value.filter(
      insight => insight.recommendationId !== recommendationId
    )
  } catch (error) {
    actionErrors.value[recommendationId] = messageFrom(
      error,
      'This insight could not be unpublished. Please try again.'
    )
  } finally {
    unpublishingId.value = null
  }
}
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

    <UAlert
      v-if="publishLoadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Published insights could not be checked"
      description="Refresh the publish status before sharing or unpublishing a recommendation."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-rotate-ccw"
          @click="() => refreshPublishedInsights()"
        >
          Try again
        </UButton>
      </template>
    </UAlert>

    <div
      v-if="status === 'pending' || publishStatus === 'pending'"
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
          @click="() => refreshRecommendations()"
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
        <RecommendationsRecommendationCard
          v-for="recommendation in recommendations"
          :key="recommendation.id"
          :recommendation="recommendation"
          :published-insight="publishedByRecommendation.get(recommendation.id) ?? null"
          :publishing="publishingId === recommendation.id"
          :unpublishing="unpublishingId === recommendation.id"
          :server-error="actionErrors[recommendation.id]"
          @publish="publish"
          @unpublish="unpublish"
        />
      </div>
    </section>
  </div>
</template>
