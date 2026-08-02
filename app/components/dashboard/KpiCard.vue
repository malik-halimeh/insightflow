<!-- Owner: M3 -->
<template>
  <div class="kpi-card">
    <p class="eyebrow">{{ label }}</p>
    <p class="metric">{{ value }}</p>
    <div class="footer">
      <DeltaChip v-if="typeof delta === 'number'" :value="delta" size="sm" />
      <span v-if="caption" class="caption">{{ caption }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Explicit import instead of relying on Nuxt's components/ auto-scan — see
// the note in app/pages/dashboard/index.vue.
import DeltaChip from './DeltaChip.vue'

defineProps<{
  label: string
  value: string
  delta?: number
  caption?: string
}>()
</script>

<style scoped>
.kpi-card {
  background: var(--if-surface);
  border: 1px solid var(--if-hairline);
  border-radius: 4px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.eyebrow {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--if-ink);
  opacity: 0.6;
}

.metric {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--if-ink);
}

.footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 22px;
}

.caption {
  font-size: 13px;
  color: var(--if-ink);
  opacity: 0.6;
}
</style>
