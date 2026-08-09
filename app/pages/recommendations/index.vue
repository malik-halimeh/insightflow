<script setup lang="ts">
import {
  outcomeSummarySchema,
  type Outcome,
  type OutcomeCreate,
  type OutcomeListResponse,
  type OutcomeSummary,
  type PublishedInsight,
  type PublishedInsightCreate,
  type Recommendation
} from '#shared/schemas'

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

useSeoMeta({ title: 'Recommendations | InsightFlow' })

const benchmarksEnabled = useRuntimeConfig().public.benchmarksEnabled

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

const {
  data: outcomeResponse,
  status: outcomeStatus,
  error: outcomeLoadError,
  refresh: refreshOutcomes
} = await useFetch('/api/outcomes', {
  default: (): OutcomeListResponse => ({
    outcomes: [],
    scoreboard: {
      total: 0,
      completed: 0,
      pending: 0,
      improved: 0,
      noClearEffect: 0,
      worsened: 0,
      improvementRate: null
    }
  })
})

const publishingId = ref<string | null>(null)
const unpublishingId = ref<string | null>(null)
const followingId = ref<string | null>(null)
const actionErrors = ref<Record<string, string | null>>({})
const outcomeActionErrors = ref<Record<string, string | null>>({})

const publishedByRecommendation = computed(() => new Map(
  publishedInsights.value.flatMap(insight =>
    insight.recommendationId ? [[insight.recommendationId, insight] as const] : []
  )
))

const outcomesByRecommendation = computed(() => new Map(
  outcomeResponse.value.outcomes.map(outcome => [outcome.recommendationId, outcome] as const)
))

const outcomesDisabled = computed(() => {
  const message = messageFrom(outcomeLoadError.value, '')
  return errorStatusCode(outcomeLoadError.value) === 404
    && message.includes('not switched on')
})

const outcomeLoadFailed = computed(
  () => Boolean(outcomeLoadError.value) && !outcomesDisabled.value
)

function errorStatusCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null

  const response = error as {
    statusCode?: number
    status?: number
    data?: { statusCode?: number }
  }

  return response.data?.statusCode ?? response.statusCode ?? response.status ?? null
}

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

function asOutcomeSummary(outcome: Outcome): OutcomeSummary {
  return outcomeSummarySchema.parse({
    id: outcome.id,
    recommendationId: outcome.recommendationId,
    datasetId: outcome.datasetId,
    followedDate: outcome.followedDate,
    note: outcome.note,
    status: outcome.status,
    title: outcome.recommendation.title,
    metric: outcome.recommendation.metric,
    dimension: outcome.recommendation.dimension,
    dimensionValue: outcome.recommendation.dimensionValue,
    expectedDirection: outcome.recommendation.expectedDirection,
    beforeValue: outcome.beforeValue,
    afterValue: outcome.afterValue,
    changePercent: outcome.changePercent,
    hasMissingSalesDates: outcome.hasMissingSalesDates,
    createdAt: outcome.createdAt,
    updatedAt: outcome.updatedAt
  })
}

async function follow(input: OutcomeCreate) {
  followingId.value = input.recommendationId
  outcomeActionErrors.value[input.recommendationId] = null
  let saved = false

  try {
    const outcome = await $fetch<Outcome>('/api/outcomes', {
      method: 'POST',
      body: input
    })
    const summary = asOutcomeSummary(outcome)

    outcomeResponse.value.outcomes = [
      summary,
      ...outcomeResponse.value.outcomes.filter(
        item => item.recommendationId !== summary.recommendationId
      )
    ]
    saved = true
  } catch (error) {
    outcomeActionErrors.value[input.recommendationId] = messageFrom(
      error,
      'This outcome could not be recorded. Check the date and try again.'
    )
  } finally {
    followingId.value = null
  }

  if (saved) {
    await refreshOutcomes()
  }
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

    <UAlert
      v-if="outcomeLoadFailed"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Outcome status could not be checked"
      description="Refresh the outcome status before recording or reviewing results."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-rotate-ccw"
          @click="() => refreshOutcomes()"
        >
          Try again
        </UButton>
      </template>
    </UAlert>

    <RecommendationsOutcomeScoreboard
      v-if="outcomeStatus !== 'pending' && !outcomesDisabled && !outcomeLoadFailed"
      :scoreboard="outcomeResponse.scoreboard"
    />

    <div
      v-if="status === 'pending' || publishStatus === 'pending' || outcomeStatus === 'pending'"
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
          :outcome="outcomesByRecommendation.get(recommendation.id) ?? null"
          :outcome-loading="followingId === recommendation.id"
          :outcomes-disabled="outcomesDisabled"
          :outcome-load-error="outcomeLoadFailed"
          :outcome-server-error="outcomeActionErrors[recommendation.id]"
          @publish="publish"
          @unpublish="unpublish"
          @follow="follow"
        >
          <template v-if="benchmarksEnabled" #benchmarkComparison="{ recommendation }">
            <InsightsBenchmarkComparison :recommendation="recommendation" />
          </template>
        </RecommendationsRecommendationCard>
      </div>
    </section>
  </div>
</template>
