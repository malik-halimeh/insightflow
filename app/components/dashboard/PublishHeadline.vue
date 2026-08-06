<!--
  OWNER: M3 (dashboard and analytics)

  Hands the headline finding off to RecommendationsShareDialog (M4's publish form)
  rather than building a second publish UI. This component's only job is picking
  the right title, metric label and metric value for the modal to prefill.
-->

<script setup lang="ts">
import type { BusinessType, PublishedInsight } from '#shared/schemas'

defineProps<{
  headline: string
  changePercent: number
  businessType: BusinessType
}>()

const open = ref(false)
const toast = useToast()

function onPublished(insight: PublishedInsight) {
  toast.add({
    title: 'Published',
    description: `Your finding is now live at /insights/${insight.slug}.`,
    icon: 'i-lucide-globe',
    color: 'success'
  })
}
</script>

<template>
  <UCard>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold">
          Share a finding to the public feed
        </h2>
        <p class="mt-1 text-sm text-muted">
          Picks the headline stat above and hands it off for publishing.
        </p>
      </div>

      <UButton icon="i-lucide-globe" @click="open = true">
        Publish headline finding
      </UButton>
    </div>

    <RecommendationsShareDialog
      v-model:open="open"
      :title="headline"
      metric-label="revenue by day of week"
      :metric-value="changePercent"
      :business-type="businessType"
      @published="onPublished"
    />
  </UCard>
</template>
