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
  <UCard>
    <p class="text-xs text-muted">
      {{ label }}
    </p>

    <p class="mt-1 text-2xl font-semibold">
      {{ value }}
    </p>

    <UiChangeIndicator
      v-if="change !== undefined"
      :value="change"
      :label="changeLabel"
      class="mt-2"
    />
  </UCard>
</template>
