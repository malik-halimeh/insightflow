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
  <p class="text-xs text-muted">
    {{ displayName }} · {{ BUSINESS_TYPE_LABELS[businessType] }} · {{ publishedDate }}
  </p>
</template>
