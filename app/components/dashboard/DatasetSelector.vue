<!-- Owner: M3 -->
<template>
  <label class="selector">
    <span class="selector-label">Dataset</span>
    <select
      class="selector-input"
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="ds in datasets" :key="ds._id" :value="ds._id">
        {{ ds.name }} · {{ ds.rowCount }} rows
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import type { DatasetSummary } from '~~/shared/types/analytics'

defineProps<{
  datasets: DatasetSummary[]
  modelValue: string
}>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<style scoped>
.selector {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.selector-label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--if-ink);
  opacity: 0.6;
}

.selector-input {
  font-family: var(--if-font);
  font-size: 14px;
  font-weight: 600;
  color: var(--if-ink);
  background: var(--if-surface);
  border: 1px solid var(--if-hairline);
  border-radius: 4px;
  padding: 8px 10px;
  min-width: 220px;
  cursor: pointer;
}

.selector-input:focus-visible {
  outline: 2px solid var(--if-brand);
  outline-offset: 1px;
}
</style>
