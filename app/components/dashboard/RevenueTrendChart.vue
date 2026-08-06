<!--
  OWNER: M3 (dashboard and analytics)

  Hand-drawn SVG rather than a chart library: one dependency fewer, and it renders
  on the server like any other markup. M3's original used scoped CSS and its own
  colour variables; this draws with the shared tokens instead, so it follows the
  theme in both light and dark mode.

  The only inline style is the plotted geometry, which is data and cannot be a
  utility class.
-->

<script setup lang="ts">
import { formatMoney } from '#shared/format'
import type { RevenuePoint } from '#shared/types/analytics'

const props = defineProps<{ points: RevenuePoint[] }>()

const WIDTH = 640
const HEIGHT = 200
const PAD = { top: 12, right: 12, bottom: 26, left: 62 }

const maxRevenue = computed(() => Math.max(...props.points.map(point => point.revenue), 1))

const coords = computed(() => {
  const innerWidth = WIDTH - PAD.left - PAD.right
  const innerHeight = HEIGHT - PAD.top - PAD.bottom
  const lastIndex = Math.max(props.points.length - 1, 1)

  return props.points.map((point, index) => ({
    x: PAD.left + (index / lastIndex) * innerWidth,
    y: PAD.top + innerHeight - (point.revenue / maxRevenue.value) * innerHeight
  }))
})

const linePoints = computed(() => coords.value.map(c => `${c.x},${c.y}`).join(' '))

const areaPoints = computed(() => {
  if (coords.value.length < 2) return ''
  const base = HEIGHT - PAD.bottom
  const first = coords.value[0]!
  const last = coords.value[coords.value.length - 1]!
  return `${first.x},${base} ${linePoints.value} ${last.x},${base}`
})

const gridLines = computed(() =>
  [0, 0.5, 1].map(fraction => ({
    y: PAD.top + (HEIGHT - PAD.top - PAD.bottom) * (1 - fraction),
    label: formatMoney(maxRevenue.value * fraction)
  }))
)

const firstDate = computed(() => props.points[0]?.date ?? '')
const lastDate = computed(() => props.points[props.points.length - 1]?.date ?? '')
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-base font-semibold">
        Revenue over time
      </h2>
      <p class="mt-1 text-sm text-muted">
        Every trading day in this period.
      </p>
    </template>

    <svg
      v-if="points.length > 1"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="w-full"
      role="img"
      :aria-label="`Revenue for each day from ${firstDate} to ${lastDate}`"
    >
      <line
        v-for="line in gridLines"
        :key="`grid-${line.y}`"
        :x1="PAD.left"
        :x2="WIDTH - PAD.right"
        :y1="line.y"
        :y2="line.y"
        class="stroke-current text-muted opacity-25"
        stroke-width="1"
      />

      <polygon :points="areaPoints" class="fill-current text-primary opacity-10" />

      <polyline
        :points="linePoints"
        class="stroke-current text-primary"
        fill="none"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <text
        v-for="line in gridLines"
        :key="`label-${line.y}`"
        :x="PAD.left - 8"
        :y="line.y + 4"
        text-anchor="end"
        class="fill-current text-xs text-muted"
      >
        {{ line.label }}
      </text>

      <text :x="PAD.left" :y="HEIGHT - 6" class="fill-current text-xs text-muted">
        {{ firstDate }}
      </text>
      <text
        :x="WIDTH - PAD.right"
        :y="HEIGHT - 6"
        text-anchor="end"
        class="fill-current text-xs text-muted"
      >
        {{ lastDate }}
      </text>
    </svg>

    <p v-else class="py-8 text-center text-sm text-muted">
      One day of sales cannot make a line. Add more history and the trend appears here.
    </p>
  </UCard>
</template>
