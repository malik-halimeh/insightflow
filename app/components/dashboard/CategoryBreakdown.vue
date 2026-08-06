<!--
  OWNER: M3 (dashboard and analytics)

  Where the money comes from, by category. A share of the total is easier to act on
  than a raw figure, so the percentage leads and the money sits beside it.
-->

<script setup lang="ts">
import { formatMoney } from '#shared/format'
import type { CategoryStat } from '#shared/types/analytics'

defineProps<{ categories: CategoryStat[] }>()
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-base font-semibold">
        Where the money comes from
      </h2>
      <p class="mt-1 text-sm text-muted">
        Each category's share of total takings.
      </p>
    </template>

    <div class="space-y-4">
      <div v-for="category in categories" :key="category.category">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3">
          <span class="text-sm font-medium">{{ category.category }}</span>
          <span class="text-sm text-muted">
            {{ category.share }}% · {{ formatMoney(category.revenue) }}
          </span>
        </div>

        <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-elevated">
          <div class="h-full rounded-full bg-primary" :style="{ width: `${category.share}%` }" />
        </div>
      </div>

      <p v-if="categories.length === 0" class="py-4 text-center text-sm text-muted">
        None of these sales have a category yet. Add one to your spreadsheet and this
        fills in.
      </p>
    </div>
  </UCard>
</template>
