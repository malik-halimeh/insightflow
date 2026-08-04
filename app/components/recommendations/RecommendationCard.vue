<script setup lang="ts">
import type { Recommendation } from '#shared/schemas'
import ShareButton from './ShareButton.vue'

const props = defineProps<{
  recommendation: Recommendation
}>()
const emit = defineEmits<{
  publish: [{
    recommendation: Recommendation
    displayName: string
    caption: string
    hideAbsoluteNumbers: boolean
  }]
}>()

function handlePublish(input: {
  displayName: string
  caption: string
  hideAbsoluteNumbers: boolean
}) {
  emit('publish', {
    recommendation: props.recommendation,
    ...input
  })
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

      <!-- The action is the point of the product, so it gets its own block. -->
      <div class="flex gap-3 rounded-md bg-elevated p-3">
        <UIcon name="i-lucide-arrow-right" class="mt-0.5 size-4 shrink-0 text-muted" />
        <p class="text-sm font-medium">
          {{ recommendation.action }}
        </p>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end">
        <ShareButton
          :title="recommendation.title"
          :metric-label="`${recommendation.metric} by ${recommendation.dimension}`"
          :metric-value="recommendation.changePercent"
          @publish="handlePublish"
        />
      </div>
    </template>
  </UCard>
</template>