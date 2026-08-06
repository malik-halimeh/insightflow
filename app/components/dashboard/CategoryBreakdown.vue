<!--
  OWNER: M3 (dashboard and analytics)

  Where the money comes from, by category: one stacked bar for the shape of the
  mix at a glance, then a legend row per category with its exact share and value.
-->

<script setup lang="ts">
import { formatMoney } from '#shared/format'
import type { CategoryStat } from '#shared/types/analytics'

defineProps<{ categories: CategoryStat[] }>()

// Cycles through the design system's allowed colour tokens, so up to four
// categories stay visually distinct without inventing a new colour.
const TONE = ['bg-primary', 'bg-info', 'bg-warning', 'bg-neutral'] as const

function tone(index: number): string {
  return TONE[index % TONE.length]!
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-base font-semibold">
        Revenue mix by category
      </h2>
      <p class="mt-1 text-sm text-muted">
        Each category's share of total takings.
      </p>
    </template>

    <div v-if="categories.length > 0" class="space-y-4">
      <div class="flex h-2 w-full overflow-hidden rounded-full bg-elevated">
        <div
          v-for="(category, index) in categories"
          :key="category.category"
          class="h-full"
          :class="tone(index)"
          :style="{ width: `${category.share}%` }"
        />
      </div>

      <ul class="space-y-3">
        <li
          v-for="(category, index) in categories"
          :key="category.category"
          class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
        >
          <span class="flex items-center gap-2 text-sm font-medium">
            <span class="size-2.5 shrink-0 rounded-full" :class="tone(index)" />
            {{ category.category }}
          </span>
          <span class="text-sm text-muted">
            {{ category.share }}% · {{ formatMoney(category.revenue) }}
          </span>
        </li>
      </ul>
    </div>

    <p v-else class="py-4 text-center text-sm text-muted">
      None of these sales have a category yet. Add one to your spreadsheet and this
      fills in.
    </p>
  </UCard>
</template>
