<!--
  OWNER: M3 (dashboard and analytics)

  Which period the dashboard is showing. A plain select, because there will rarely
  be more than a handful and a search box would be pretending otherwise.
-->

<script setup lang="ts">
import { formatCount } from '#shared/format'
import type { DatasetSummary } from '#shared/types/analytics'

const props = defineProps<{ datasets: DatasetSummary[] }>()

const selected = defineModel<string>({ required: true })

const items = computed(() =>
  props.datasets.map(dataset => ({
    label: `${dataset.name} — ${formatCount(dataset.rowCount)} rows`,
    value: dataset.id
  }))
)
</script>

<template>
  <USelect
    v-model="selected"
    :items="items"
    icon="i-lucide-table"
    aria-label="Choose which data set to show"
    class="w-full sm:w-72"
  />
</template>
