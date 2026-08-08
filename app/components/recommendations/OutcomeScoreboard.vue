<script setup lang="ts">
import { formatCount } from '#shared/format'
import type { OutcomeScoreboard } from '#shared/schemas'

defineProps<{
  scoreboard: OutcomeScoreboard
}>()
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-base font-semibold">
        Advice scoreboard
      </h2>
      <p class="mt-2 text-sm text-muted">
        Observed results across every recommendation you recorded as followed.
      </p>
    </div>

    <UiEmptyState
      v-if="scoreboard.total === 0"
      icon="i-lucide-lightbulb"
      title="No outcomes recorded yet"
      description="Record a recommendation as followed to start measuring an equal before-and-after comparison."
    />

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiMetricCard
          label="Improved"
          :value="formatCount(scoreboard.improved)"
        />
        <UiMetricCard
          label="No clear effect"
          :value="formatCount(scoreboard.noClearEffect)"
        />
        <UiMetricCard
          label="Worsened"
          :value="formatCount(scoreboard.worsened)"
        />
        <UiMetricCard
          label="Still waiting"
          :value="formatCount(scoreboard.pending)"
        />
      </div>

      <UAlert
        v-if="scoreboard.completed > 0"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="Observed improvement rate"
        :description="`${formatCount(scoreboard.improved)} of ${formatCount(scoreboard.completed)} completed outcomes were classified as improved. Pending outcomes are excluded; no-clear-effect and worsened outcomes are included. This comparison does not prove the advice caused the result.`"
      />

      <UAlert
        v-else
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="Results are still gathering"
        description="An improvement rate will be available after an outcome completes. Pending outcomes are not treated as successes or failures."
      />
    </template>
  </section>
</template>
