<!-- Owner: M3 -->
<template>
  <div class="chart-card">
    <h3 class="chart-title">Revenue mix by category</h3>

    <div v-if="categories.length" class="stack" role="img" aria-label="Revenue share by category">
      <span
        v-for="(c, i) in categories"
        :key="c.category"
        class="segment"
        :style="{ width: `${c.share}%`, background: colorFor(i) }"
        :title="`${c.category}: ${c.share}%`"
      />
    </div>

    <ul v-if="categories.length" class="legend">
      <li v-for="(c, i) in categories" :key="c.category" class="legend-row">
        <span class="swatch" :style="{ background: colorFor(i) }" />
        <span class="legend-name">{{ c.category }}</span>
        <span class="legend-value">{{ c.share }}%</span>
        <span class="legend-revenue">${{ c.revenue.toLocaleString() }}</span>
      </li>
    </ul>

    <p v-else class="empty">No category data yet.</p>
  </div>
</template>

<script setup lang="ts">
import type { CategoryStat } from '~~/shared/types/analytics'

defineProps<{ categories: CategoryStat[] }>()

// Brand-derived, colourblind-considerate categorical palette — kept distinct
// from the positive/negative/flat semantic colours used by the delta chip.
const palette = ['#3B5BA5', '#7C93C6', '#B98A4A', '#4A8FA6', '#8D6BA8', '#6B7280']
function colorFor(i: number) {
  return palette[i % palette.length]
}
</script>

<style scoped>
.chart-card {
  background: var(--if-surface);
  border: 1px solid var(--if-hairline);
  border-radius: 8px;
  padding: 16px;
}

.chart-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--if-ink);
}

.stack {
  display: flex;
  width: 100%;
  height: 10px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.segment {
  height: 100%;
}

.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) 48px 72px;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--if-ink);
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-name {
  opacity: 0.85;
}

.legend-value,
.legend-revenue {
  text-align: right;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}

.empty {
  font-size: 14px;
  color: var(--if-ink);
  opacity: 0.6;
}
</style>
