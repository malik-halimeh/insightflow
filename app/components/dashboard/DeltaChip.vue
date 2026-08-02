<!-- Owner: M3 -->
<!--
  The signature element (design token sheet, section 4): arrow + number +
  plain-language comparison. Pill radius, tinted fill of the semantic colour
  at 10% opacity, full-strength colour for the number only. Colour is never
  the only signal — the glyph carries meaning on its own for colourblind
  readers. Same component, two sizes: "sm" for dense table cells, "md" for
  the dashboard hero.
-->
<template>
  <span class="chip" :class="[tone, size]">
    <span class="glyph" aria-hidden="true">{{ glyph }}</span>
    <span class="value">{{ formattedValue }}</span>
    <span v-if="label" class="label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    label?: string
    size?: 'sm' | 'md'
    flatThreshold?: number
  }>(),
  { size: 'sm', flatThreshold: 3, label: '' },
)

const tone = computed<'positive' | 'negative' | 'flat'>(() => {
  if (Math.abs(props.value) < props.flatThreshold) return 'flat'
  return props.value > 0 ? 'positive' : 'negative'
})

const glyph = computed(() => (tone.value === 'positive' ? '▲' : tone.value === 'negative' ? '▼' : '■'))

const formattedValue = computed(() => {
  const sign = props.value > 0 ? '+' : ''
  return `${sign}${props.value}%`
})
</script>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  font-family: var(--if-font);
  white-space: nowrap;
  line-height: 1;
}

.chip.sm {
  padding: 5px 10px;
  font-size: 13px;
}

.chip.md {
  padding: 7px 14px;
  font-size: 16px;
}

.glyph {
  font-size: 0.8em;
}

.value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.label {
  font-weight: 400;
  color: var(--if-ink);
  opacity: 0.72;
}

.chip.positive {
  background: color-mix(in srgb, var(--if-positive) 10%, transparent);
}
.chip.positive .glyph,
.chip.positive .value {
  color: var(--if-positive);
}

.chip.negative {
  background: color-mix(in srgb, var(--if-negative) 10%, transparent);
}
.chip.negative .glyph,
.chip.negative .value {
  color: var(--if-negative);
}

.chip.flat {
  background: color-mix(in srgb, var(--if-flat) 10%, transparent);
}
.chip.flat .glyph,
.chip.flat .value {
  color: var(--if-flat);
}
</style>
