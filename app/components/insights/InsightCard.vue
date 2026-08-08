<script setup lang="ts">
import { changeDirection, formatPercentChange } from '#shared/format'
import type { PublishedInsight } from '#shared/schemas'

const props = defineProps<{
  insight: PublishedInsight
}>()

/*
  The percentage is the whole point of a published insight, so it is printed at
  display size and tinted by direction. The arrow carries the same meaning as the
  colour, which is what keeps it readable in greyscale, exactly as UiChangeIndicator
  does everywhere else in the product.
*/
const direction = computed(() => changeDirection(props.insight.metricValue))

const TONE = {
  up: 'text-success',
  down: 'text-error',
  flat: 'text-muted'
} as const

const ICON = {
  up: 'i-lucide-arrow-up-right',
  down: 'i-lucide-arrow-down-right',
  flat: 'i-lucide-minus'
} as const
</script>

<template>
  <UCard class="lift">
    <div class="flex items-start justify-between gap-4">
      <InsightsInsightMeta
        :display-name="insight.displayName"
        :business-type="insight.businessType"
        :published-at="insight.publishedAt"
      />

      <UIcon :name="ICON[direction]" class="size-5 shrink-0" :class="TONE[direction]" />
    </div>

    <p class="figure mt-5 text-5xl" :class="TONE[direction]">
      {{ formatPercentChange(insight.metricValue) }}
    </p>

    <h2 class="mt-3 text-lg font-semibold leading-snug">
      {{ insight.metricLabel }}
    </h2>

    <p class="mt-3 text-sm leading-relaxed text-muted">
      {{ insight.caption }}
    </p>

    <template #footer>
      <div class="flex items-center justify-between gap-4">
        <NuxtLink :to="`/insights/${insight.slug}`" class="text-sm font-medium ink-accent hover:underline">
          Read insight
        </NuxtLink>

        <span class="text-xs text-muted">
          {{ insight.hideAbsoluteNumbers ? 'Takings hidden' : 'Change only' }}
        </span>
      </div>
    </template>
  </UCard>
</template>
