<!--
  OWNER: M3 (dashboard and analytics)

  The one finding a busy owner reads before anything else: the biggest gap between
  the best and worst trading day, in a single sentence. Built from `busiestDay` and
  `quietestDay`, which the analytics summary already computes — this never guesses
  at a comparison the API has not made.
-->

<script setup lang="ts">
import { formatCount, formatPercentChange } from '#shared/format'

defineProps<{
  changePercent: number
  sentence: string
  rowCount: number
  periodStart: string
  periodEnd: string
}>()
</script>

<template>
  <UCard>
    <UiChangeIndicator :value="changePercent" />

    <p class="mt-2 text-2xl font-semibold tracking-tight">
      {{ formatPercentChange(changePercent) }}
    </p>

    <p class="mt-2 text-sm">
      {{ sentence }}
    </p>

    <p class="mt-1 text-xs text-muted">
      Based on {{ formatCount(rowCount) }} rows · {{ periodStart }} → {{ periodEnd }}
    </p>
  </UCard>
</template>
