<!-- Owner: M3 -->
<template>
  <div class="chart-card">
    <h3 class="chart-title">Revenue by day of week</h3>
    <p class="chart-sub">Average revenue per weekday, compared with the overall daily average.</p>

    <div class="bars">
      <div v-for="d in days" :key="d.day" class="bar-row">
        <span class="bar-day">{{ d.day }}</span>
        <div class="bar-track">
          <div
            class="bar-fill"
            :class="d.delta.tone"
            :style="{ width: `${barWidth(d.avgRevenue)}%` }"
          />
        </div>
        <span class="bar-value">{{ formatCurrency(d.avgRevenue) }}</span>
        <DeltaChip :value="d.delta.value" size="sm" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DayOfWeekStat } from '~~/shared/types/analytics'
// Explicit import instead of relying on Nuxt's components/ auto-scan — see
// the note in app/pages/dashboard/index.vue.
import DeltaChip from './DeltaChip.vue'

const props = defineProps<{ days: DayOfWeekStat[] }>()

const maxAvg = computed(() => Math.max(...props.days.map((d) => d.avgRevenue), 1))

function barWidth(value: number) {
  return Math.max((value / maxAvg.value) * 100, value > 0 ? 3 : 0)
}

function formatCurrency(v: number) {
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
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
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--if-ink);
}

.chart-sub {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--if-ink);
  opacity: 0.6;
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bar-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 64px auto;
  align-items: center;
  gap: 10px;
}

.bar-day {
  font-size: 13px;
  font-weight: 600;
  color: var(--if-ink);
  opacity: 0.75;
}

.bar-track {
  height: 10px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--if-ink) 6%, transparent);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
  background: var(--if-brand);
}

.bar-fill.positive {
  background: var(--if-positive);
}
.bar-fill.negative {
  background: var(--if-negative);
}
.bar-fill.flat {
  background: var(--if-flat);
}

.bar-value {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--if-ink);
  opacity: 0.75;
  text-align: right;
}
</style>
