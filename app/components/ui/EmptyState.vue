<script setup lang="ts">
withDefaults(defineProps<{
  /** What is missing, e.g. "No data sets yet". */
  title: string
  /** What to do about it. An empty screen is an instruction, not an apology. */
  description?: string
  icon?: string
}>(), {
  icon: 'i-lucide-inbox'
})
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-md border border-dashed border-default px-6 py-12 text-center">
    <UIcon :name="icon" class="size-8 text-muted" />

    <p class="mt-4 font-semibold">
      {{ title }}
    </p>

    <p v-if="description" class="mt-1 max-w-sm text-sm text-muted">
      {{ description }}
    </p>

    <div v-if="$slots.action" class="mt-6">
      <slot name="action" />
    </div>
  </div>
</template>
