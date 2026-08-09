<script setup lang="ts">
import type {
  OutcomeCreate,
  OutcomeStatus,
  OutcomeSummary,
  PublishedInsight,
  PublishedInsightCreate,
  Recommendation
} from '#shared/schemas'
import FollowOutcomeButton from './FollowOutcomeButton.vue'
import ShareButton from './ShareButton.vue'

const props = defineProps<{
  recommendation: Recommendation
  publishedInsight?: PublishedInsight | null
  publishing?: boolean
  unpublishing?: boolean
  serverError?: string | null
  outcome?: OutcomeSummary | null
  outcomeLoading?: boolean
  outcomesDisabled?: boolean
  outcomeLoadError?: boolean
  outcomeServerError?: string | null
}>()
const emit = defineEmits<{
  publish: [PublishedInsightCreate]
  unpublish: [recommendationId: string]
  follow: [OutcomeCreate]
}>()
defineSlots<{
  benchmarkComparison(props: { recommendation: Recommendation }): unknown
}>()

const unpublishOpen = ref(false)

const metricLabel = computed(() => {
  const metric = {
    revenue: 'Revenue',
    quantity: 'Units sold',
    orders: 'Orders'
  }[props.recommendation.metric]

  const dimension = {
    dayOfWeek: 'day of week',
    item: 'item',
    category: 'category',
    hour: 'hour'
  }[props.recommendation.dimension]

  return `${metric} by ${dimension}`
})

function unpublish() {
  unpublishOpen.value = false
  emit('unpublish', props.recommendation.id)
}

const outcomeUnavailableReason = computed(() => {
  if (
    !props.recommendation.dimensionValue
    || !props.recommendation.operator
    || !props.recommendation.expectedDirection
  ) {
    return 'This finding was generated before outcome tracking, so its result cannot be measured.'
  }

  if (props.recommendation.dimension === 'hour') {
    return 'This finding needs time-of-day sales data before its result can be measured.'
  }

  return null
})

function outcomeLabel(status: OutcomeStatus): string {
  if (status === 'pending') return 'Waiting for result'
  if (status === 'improved') return 'Improved'
  if (status === 'no_clear_effect') return 'No clear effect'
  return 'Worsened'
}

</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold">
            {{ recommendation.title }}
          </h2>

          <p class="mt-2 text-xs text-muted">
            {{ recommendation.metric }} by {{ recommendation.dimension }}
          </p>
        </div>

        <UBadge
          :color="
            recommendation.severity === 'opportunity'
              ? 'success'
              : recommendation.severity === 'warning'
                ? 'warning'
                : 'info'
          "
        >
          {{
            recommendation.severity === 'opportunity'
              ? 'Opportunity'
              : recommendation.severity === 'warning'
                ? 'Warning'
                : 'Info'
          }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <p class="text-sm">
        {{ recommendation.body }}
      </p>

      <div class="flex items-center gap-2">
        <UiChangeIndicator :value="recommendation.changePercent" />

        <span class="text-xs text-muted">
          against the average
        </span>
      </div>

      <slot
        name="benchmarkComparison"
        :recommendation="recommendation"
      />

      <!-- The action is the point of the product, so it gets its own block. -->
      <div class="flex gap-4 bg-elevated p-4">
        <UIcon name="i-lucide-arrow-right" class="size-4 shrink-0 text-muted" />
        <p class="text-sm font-semibold">
          {{ recommendation.action }}
        </p>
      </div>

      <UAlert
        v-if="serverError && publishedInsight"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :description="serverError"
      />
    </div>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <template v-if="outcome">
            <UBadge color="neutral" variant="subtle">
              {{ outcomeLabel(outcome.status) }}
            </UBadge>

            <UButton
              :to="`/recommendations/${recommendation.id}/outcome`"
              color="neutral"
              variant="subtle"
              icon="i-lucide-lightbulb"
            >
              View outcome
            </UButton>
          </template>

          <UBadge v-else-if="outcomesDisabled" color="neutral" variant="subtle">
            Outcome tracking unavailable
          </UBadge>

          <UBadge v-else-if="outcomeLoadError" color="error" variant="subtle">
            Outcome status unavailable
          </UBadge>

          <UButton v-else-if="outcomeLoading" loading disabled>
            Checking outcome
          </UButton>

          <div v-else-if="outcomeUnavailableReason" class="space-y-2">
            <UButton disabled icon="i-lucide-check">
              I followed this
            </UButton>
            <p class="text-xs text-muted">
              {{ outcomeUnavailableReason }}
            </p>
          </div>

          <FollowOutcomeButton
            v-else
            :recommendation-id="recommendation.id"
            :loading="outcomeLoading"
            :server-error="outcomeServerError"
            @follow="emit('follow', $event)"
          />
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <template v-if="publishedInsight">
            <UBadge color="neutral" variant="subtle">
              Published
            </UBadge>

            <UButton
              :to="`/insights/${publishedInsight.slug}`"
              color="neutral"
              variant="subtle"
              icon="i-lucide-external-link"
            >
              View public insight
            </UButton>

            <UButton
              color="error"
              icon="i-lucide-eye-off"
              :loading="unpublishing"
              @click="unpublishOpen = true"
            >
              Unpublish
            </UButton>
          </template>

          <ShareButton
            v-else
            :recommendation-id="recommendation.id"
            :title="recommendation.title"
            :metric-label="metricLabel"
            :metric-value="recommendation.changePercent"
            :loading="publishing"
            :server-error="serverError"
            @publish="emit('publish', $event)"
          />
        </div>
      </div>
    </template>
  </UCard>

  <UModal v-model:open="unpublishOpen" title="Unpublish this insight?">
    <template #body>
      <div class="space-y-4 text-sm">
        <p>
          <span class="font-semibold">{{ recommendation.title }}</span> will disappear from the public
          feed and its public link will stop working.
        </p>
        <p class="text-muted">
          The private recommendation and its sales data stay unchanged.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="subtle" @click="unpublishOpen = false">
          Keep published
        </UButton>
        <UButton color="error" @click="unpublish">
          Unpublish
        </UButton>
      </div>
    </template>
  </UModal>
</template>
