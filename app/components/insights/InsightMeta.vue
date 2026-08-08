<script setup lang="ts">
import type { BusinessType } from '#shared/schemas'

const props = defineProps<{
  displayName: string
  businessType: BusinessType
  publishedAt: string
}>()

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurant: 'Restaurant',
  retail: 'Shop',
  gym: 'Gym'
}

const publishedDate = computed(() => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).format(new Date(props.publishedAt)))
</script>

<template>
  <!--
    Two lines rather than one run of names separated by dots. The business is who
    is speaking and belongs on its own line; the trade and the date are the frame
    around it and sit quietly underneath.
  -->
  <div class="min-w-0">
    <p class="truncate text-sm font-semibold">
      {{ displayName }}
    </p>
    <p class="mt-0.5 text-xs text-muted">
      {{ BUSINESS_TYPE_LABELS[businessType] }} · {{ publishedDate }}
    </p>
  </div>
</template>
