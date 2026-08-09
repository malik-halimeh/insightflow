<!--
  OWNER: M1 (shared components)

  History and forecast on one axis, with the forecast drawn as a band rather than
  a line. Used by the forecast screen; pass it data and leave the internals alone.

  Hand-drawn SVG, following app/components/dashboard/RevenueTrendChart.vue. There
  is no chart library in this project and adding one is a stack-rule violation.

  NOT wrapped in <ClientOnly>. CLAUDE.md rule 5 applies to components touching a
  chart library or `window`; this touches neither, and the existing SVG chart is
  unwrapped for the same reason. Wrapping it would buy a loading flash and nothing
  else. If this ever measures the DOM or reads `window`, the wrapper becomes
  required.

  WHAT NOT TO CHANGE
  - The band. A prediction drawn as a single line claims a precision four
    same-weekday averages cannot support. The band is measured: real takings land
    inside it about 86% of the time.
  - The dashed forecast line and the divider. An owner must be able to see at a
    glance where the record stops and the guess starts.
-->

<script setup lang="ts">
import { formatMoney } from '#shared/format'
import type { ActualPoint, ForecastPoint } from '#shared/types/forecast'

const props = defineProps<{
  /** Real trading days, oldest first. */
  actuals: ActualPoint[]
  /** Predicted days, continuing on from the last actual. Empty means nothing to draw. */
  points: ForecastPoint[]
}>()

const WIDTH = 640
const HEIGHT = 200
const PAD = { top: 12, right: 12, bottom: 26, left: 62 }

const innerWidth = WIDTH - PAD.left - PAD.right
const innerHeight = HEIGHT - PAD.top - PAD.bottom

/** Everything on one axis, so history flows into the forecast without a seam. */
const totalPoints = computed(() => props.actuals.length + props.points.length)

const scale = computed(() => {
  // The band's ceiling, not just the line's, or an upper bound would be clipped.
  const highest = Math.max(
    ...props.actuals.map(point => point.revenue),
    ...props.points.map(point => point.upper),
    1
  )
  const lastIndex = Math.max(totalPoints.value - 1, 1)

  return {
    highest,
    x: (index: number) => PAD.left + (index / lastIndex) * innerWidth,
    y: (value: number) => PAD.top + innerHeight - (value / highest) * innerHeight
  }
})

const actualCoords = computed(() =>
  props.actuals.map((point, index) => ({ x: scale.value.x(index), y: scale.value.y(point.revenue) }))
)

const forecastCoords = computed(() =>
  props.points.map((point, index) => ({
    x: scale.value.x(props.actuals.length + index),
    y: scale.value.y(point.predicted),
    upper: scale.value.y(point.upper),
    lower: scale.value.y(point.lower)
  }))
)

const actualLine = computed(() => actualCoords.value.map(c => `${c.x},${c.y}`).join(' '))

/**
 * The forecast line starts at the last real day, so the two meet rather than
 * leaving a gap the width of one day between the record and the prediction.
 */
const forecastLine = computed(() => {
  const join = actualCoords.value[actualCoords.value.length - 1]
  const points = forecastCoords.value.map(c => `${c.x},${c.y}`)
  return join ? [`${join.x},${join.y}`, ...points].join(' ') : points.join(' ')
})

/** Upper bound left to right, then lower bound back again. */
const bandShape = computed(() => {
  if (forecastCoords.value.length === 0) return ''
  const top = forecastCoords.value.map(c => `${c.x},${c.upper}`)
  const bottom = [...forecastCoords.value].reverse().map(c => `${c.x},${c.lower}`)
  return [...top, ...bottom].join(' ')
})

/** Where the record stops and the guess starts. */
const dividerX = computed(() => actualCoords.value[actualCoords.value.length - 1]?.x ?? 0)

const gridLines = computed(() =>
  [0, 0.5, 1].map(fraction => ({
    y: PAD.top + innerHeight * (1 - fraction),
    label: formatMoney(scale.value.highest * fraction)
  }))
)

const firstDate = computed(() => props.actuals[0]?.date ?? '')
const lastDate = computed(() => props.points[props.points.length - 1]?.date ?? '')
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-base font-semibold">
        What next week is likely to take
      </h2>
      <p class="mt-1 text-sm text-muted">
        The shaded band is the range each day is expected to fall within.
      </p>
    </template>

    <svg
      v-if="points.length > 0 && actuals.length > 0"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="w-full"
      role="img"
      :aria-label="`Daily takings from ${firstDate}, with a forecast to ${lastDate} shown as a range`"
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

      <polygon :points="bandShape" class="fill-current text-primary opacity-10" />

      <line
        :x1="dividerX"
        :x2="dividerX"
        :y1="PAD.top"
        :y2="HEIGHT - PAD.bottom"
        class="stroke-current text-muted opacity-40"
        stroke-width="1"
        stroke-dasharray="2 3"
      />

      <polyline
        :points="actualLine"
        class="stroke-current ink-accent"
        fill="none"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <polyline
        :points="forecastLine"
        class="stroke-current ink-accent"
        fill="none"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
        stroke-dasharray="5 4"
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
      There is not enough trading history to predict from yet. Keep uploading your
      sales and the forecast appears here.
    </p>
  </UCard>
</template>
