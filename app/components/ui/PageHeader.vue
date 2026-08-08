<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-default pb-6">
    <div class="min-w-0 max-w-2xl">
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-2 text-sm leading-6 text-muted">
        {{ description }}
      </p>
    </div>

    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
