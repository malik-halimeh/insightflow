<!-- Owner: M3 -->
<template>
  <div class="chart-card">
    <div class="chart-head">
      <h3 class="chart-title">Revenue over time</h3>
      <DeltaChip v-if="trend.length > 1" :value="deltaValue" size="sm" label="vs first half of period" />
    </div>

    <svg
      v-if="points.length > 1"
      :viewBox="`0 0 ${width} ${height}`"
      class="chart-svg"
      role="img"
      :aria-label="`Revenue trend from ${trend[0]?.date} to ${trend[trend.length - 1]?.date}`"
    >
      <line
        v-for="g in gridLines"
        :key="g.y"
        :x1="padding.left"
        :x2="width - padding.right"
        :y1="g.y"
        :y2="g.y"
        class="grid-line"
      />
      <polygon :points="areaPoints" class="area" />
      <polyline :points="linePoints" class="line" />
      <circle
        v-for="(p, i) in points"
        :key="i"
        :cx="p.x"
        :cy="p.y"
        r="2.5"
        class="dot"
      />
      <text v-for="g in gridLines" :key="`t-${g.y}`" :x="padding.left - 8" :y="g.y + 4" class="grid-label" text-anchor="end">
        {{ g.label }}
      </text>
      <text :x="padding.left" :y="height - 6" class="axis-label">{{ trend[0]?.date }}</text>
      <text :x="width - padding.right" :y="height - 6" class="axis-label" text-anchor="end">
        {{ trend[trend.length - 1]?.date }}
      </text>
    </svg>

    <p v-else class="empty">Not enough daily data yet to plot a trend.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RevenuePoint } from '~~/shared/types/analytics'
// Explicit import instead of relying on Nuxt's components/ auto-scan — see
// the note in app/pages/dashboard/index.vue.
import DeltaChip from './DeltaChip.vue'

const props = defineProps<{
  trend: RevenuePoint[]
  deltaValue: number
}>()

const width = 640
const height = 220
const padding = { top: 16, right: 16, bottom: 28, left: 52 }

const maxRevenue = computed(() => Math.max(...props.trend.map((p) => p.revenue), 1))

const points = computed(() => {
  const t = props.trend
  if (t.length < 2) return []
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  return t.map((p, i) => ({
    x: padding.left + (i / (t.length - 1)) * innerW,
    y: padding.top + innerH - (p.revenue / maxRevenue.value) * innerH,
    revenue: p.revenue,
  }))
})

const linePoints = computed(() => points.value.map((p) => `${p.x},${p.y}`).join(' '))

const areaPoints = computed(() => {
  if (!points.value.length) return ''
  const baseline = height - padding.bottom
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return `${first.x},${baseline} ${linePoints.value} ${last.x},${baseline}`
})

const gridLines = computed(() => {
  const innerH = height - padding.top - padding.bottom
  const steps = 3
  return Array.from({ length: steps + 1 }, (_, i) => {
    const ratio = i / steps
    const y = padding.top + innerH * ratio
    const value = Math.round(maxRevenue.value * (1 - ratio))
    return { y, label: value.toLocaleString() }
  })
})
</script>

<style scoped>
.chart-card {
  background: var(--if-surface);
  border: 1px solid var(--if-hairline);
  border-radius: 8px;
  padding: 16px;
}

.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.chart-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--if-ink);
}

.chart-svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.grid-line {
  stroke: var(--if-hairline);
  stroke-width: 1;
}

.grid-label,
.axis-label {
  font-size: 10px;
  fill: var(--if-ink);
  opacity: 0.55;
  font-variant-numeric: tabular-nums;
}

.area {
  fill: color-mix(in srgb, var(--if-brand) 12%, transparent);
  stroke: none;
}

.line {
  fill: none;
  stroke: var(--if-brand);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.dot {
  fill: var(--if-paper);
  stroke: var(--if-brand);
  stroke-width: 1.5;
}

.empty {
  font-size: 14px;
  color: var(--if-ink);
  opacity: 0.6;
}
</style>
