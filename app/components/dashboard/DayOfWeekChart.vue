<!--
  OWNER: M3 (dashboard and analytics)

  Horizontal bars rather than a chart library. Each row carries the weekday, the
  bar, the average takings and how that compares with an ordinary day.

  The comparison uses UiChangeIndicator, so up, down and flat look the same here as
  everywhere else in the product, and the arrow and sign carry the meaning as well
  as the colour.
-->

<script setup lang="ts">
import { changeDirection, formatMoney } from '#shared/format'
import type { DayOfWeekStat } from '#shared/types/analytics'

const props = defineProps<{
  days: DayOfWeekStat[]
  /** Hidden when the period is too short for a weekday pattern to mean anything. */
  showComparison?: boolean
}>()

const busiest = computed(() => Math.max(...props.days.map(day => day.avgRevenue), 1))

function barWidth(value: number): string {
  if (value <= 0) return '0%'
  // A trading day always shows something, however quiet.
  return `${Math.max((value / busiest.value) * 100, 2)}%`
}

// Same up/down/flat tones as UiChangeIndicator, so a busy Saturday and a quiet
// Tuesday read the same way here as they do everywhere else in the product.
const BAR_TONE = { up: 'bg-success', down: 'bg-error', flat: 'bg-neutral' } as const

function barTone(day: DayOfWeekStat): string {
  if (!props.showComparison || day.totalRevenue <= 0) return 'bg-primary'
  return BAR_TONE[changeDirection(day.changePercent)]
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-base font-semibold">
        Revenue by day of week
      </h2>
      <p class="mt-1 text-sm text-muted">
        What an average Monday, Tuesday and so on actually takes.
      </p>
    </template>

    <div class="space-y-3">
      <div v-for="day in days" :key="day.day" class="flex items-center gap-3">
        <span class="w-10 shrink-0 text-sm text-muted">{{ day.day.slice(0, 3) }}</span>

        <div class="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-elevated">
          <div class="h-full rounded-full" :class="barTone(day)" :style="{ width: barWidth(day.avgRevenue) }" />
        </div>

        <span class="w-20 shrink-0 text-right text-sm font-medium">
          {{ formatMoney(day.avgRevenue) }}
        </span>

        <div class="w-20 shrink-0">
          <UiChangeIndicator v-if="showComparison && day.totalRevenue > 0" :value="day.changePercent" />
        </div>
      </div>
    </div>
  </UCard>
</template>
