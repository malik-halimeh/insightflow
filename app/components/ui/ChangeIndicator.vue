<script setup lang="ts">
import { changeDirection, formatPercentChange } from '#shared/format'

const props = defineProps<{
  /** The percentage change itself, e.g. -18.5 for a fall of 18.5%. */
  value: number
  /** Optional trailing context, e.g. "against the weekly average". */
  label?: string
}>()

const direction = computed(() => changeDirection(props.value))

// Colour is never the only signal: the arrow and the sign carry the same meaning,
// so the figure still reads correctly in greyscale or to a colourblind owner.
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
  <span class="inline-flex items-center gap-1 text-sm font-medium" :class="TONE[direction]">
    <UIcon :name="ICON[direction]" class="size-4 shrink-0" />
    {{ formatPercentChange(value) }}
    <span v-if="label" class="font-normal text-muted">{{ label }}</span>
  </span>
</template>
