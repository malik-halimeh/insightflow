<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false
})
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <span
      class="flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-950 ring-1 ring-primary/30"
      :class="compact ? 'size-7' : 'size-9'"
    >
      <UIcon name="i-lucide-chart-column" :class="compact ? 'size-4' : 'size-5'" />
    </span>
    <span v-if="!compact" class="font-semibold tracking-tight">
      InsightFlow
    </span>
  </span>
</template>
