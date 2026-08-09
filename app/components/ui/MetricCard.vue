<script setup lang="ts">
defineProps<{
  /** What the figure measures, e.g. "Revenue". */
  label: string
  /** Already formatted by formatMoney or formatCount, so the card never guesses. */
  value: string
  /** Percentage change against the comparison period. Omit when there is nothing to compare. */
  change?: number
  /** Names the comparison, e.g. "against last week". */
  changeLabel?: string
}>()
</script>

<template>
  <UCard class="relative overflow-hidden">
    <div class="absolute inset-y-0 left-0 w-1 bg-primary" />
    <div class="pl-1">
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">
        {{ label }}
      </p>

      <p class="mt-2 text-2xl font-semibold tracking-tight">
        {{ value }}
      </p>

      <UiChangeIndicator
        v-if="change !== undefined"
        :value="change"
        :label="changeLabel"
        class="mt-3"
      />
    </div>
  </UCard>
</template>
