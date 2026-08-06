<!--
  OWNER: M4 (recommendations and publishing)

  WHAT THIS IS
  The findings InsightFlow produces, loaded from `/api/recommendations` (which
  reads the `recommendations` collection in MongoDB). Each card carries four
  things, in this order: what we found, what to do about it, the number behind
  it, and how important it is.

  WHAT NOT TO CHANGE
  - The severity badge shows an icon AND a word, not just a colour. Roughly one man
    in twelve cannot separate red from green, and this product is nothing but
    numbers going up and down. Never reduce it to a coloured dot.
  - Share is a quiet button on purpose. The recommendation is what the owner came
    for; publishing is a decision they make afterwards.
  - The suggested action is a full sentence an owner could act on today. "Optimise
    Tuesday" is not an action. "Move one member of staff off Tuesday" is.
  - The class names. They come from docs/DESIGN-SYSTEM.md.
-->

<script setup lang="ts">
import type { Recommendation, Severity } from '#shared/schemas'
import { formatPercentChange } from '#shared/format'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Recommendations — InsightFlow' })

const {
  data: recommendations,
  status,
  error,
  refresh
} = await useFetch('/api/recommendations', {
  default: (): Recommendation[] => []
})

// Icon and word travel with the colour, so the meaning survives without it.
const SEVERITY: Record<Severity, { label: string, icon: string, color: 'info' | 'success' | 'warning' }> = {
  info: { label: 'Information', icon: 'i-lucide-info', color: 'info' },
  opportunity: { label: 'Opportunity', icon: 'i-lucide-lightbulb', color: 'success' },
  warning: { label: 'Worth watching', icon: 'i-lucide-triangle-alert', color: 'warning' }
}

const shareOpen = ref(false)
const sharing = ref<Recommendation | null>(null)

function openShare(finding: Recommendation) {
  sharing.value = finding
  shareOpen.value = true
}

const deleting = ref<string | null>(null)
const toast = useToast()

async function onDelete(finding: Recommendation) {
  deleting.value = finding.id
  try {
    await $fetch(`/api/recommendations/${finding.id}`, { method: 'DELETE' })
    toast.add({ title: 'Recommendation removed', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Could not remove this recommendation',
      description: (err as { statusMessage?: string }).statusMessage ?? 'Please try again.',
      color: 'error'
    })
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <div>
    <UiPageHeader title="Recommendations" description="What your sales data is telling you.">
      <template #actions>
        <UButton to="/recommendations/rules" color="neutral" variant="subtle" icon="i-lucide-sliders-horizontal">
          Rules
        </UButton>
      </template>
    </UiPageHeader>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-4">
      <USkeleton v-for="card in 3" :key="card" class="h-40 w-full" />
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="We could not load your recommendations"
      description="Please refresh the page and try again."
    />

    <!-- Empty -->
    <UiEmptyState
      v-else-if="recommendations.length === 0"
      icon="i-lucide-lightbulb"
      title="No recommendations yet"
      description="InsightFlow looks for patterns using rules you control. Set up a rule and any matching findings appear here."
    >
      <template #action>
        <UButton to="/recommendations/rules" icon="i-lucide-sliders-horizontal">
          Set up a rule
        </UButton>
      </template>
    </UiEmptyState>

    <!-- Ready -->
    <div v-else class="space-y-4">
      <UCard v-for="finding in recommendations" :key="finding.id">
        <div class="space-y-4">
          <!-- Severity first: it tells the owner whether to read on. -->
          <div class="flex flex-wrap items-start justify-between gap-3">
            <UBadge
              :color="SEVERITY[finding.severity].color"
              :icon="SEVERITY[finding.severity].icon"
              variant="subtle"
            >
              {{ SEVERITY[finding.severity].label }}
            </UBadge>

            <UiChangeIndicator :value="finding.changePercent" />
          </div>

          <div>
            <h2 class="text-lg font-semibold">
              {{ finding.title }}
            </h2>
            <p class="mt-2 text-sm text-muted">
              {{ finding.body }}
            </p>
          </div>

          <!-- The action is the point of the whole product. -->
          <div class="flex gap-3 rounded-md bg-elevated p-3">
            <UIcon name="i-lucide-arrow-right" class="mt-0.5 size-4 shrink-0 text-muted" />
            <p class="text-sm font-medium">
              {{ finding.action }}
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs text-muted">
              Based on {{ finding.metric }} by {{ finding.dimension }},
              {{ formatPercentChange(finding.changePercent) }}
            </span>

            <div class="flex items-center gap-1">
              <!-- Quiet on purpose. It must not compete with the finding. -->
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-share-2"
                @click="openShare(finding)"
              >
                Share
              </UButton>
              <UButton
                color="error"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                :loading="deleting === finding.id"
                @click="onDelete(finding)"
              >
                Remove
              </UButton>
            </div>
          </div>
        </template>
      </UCard>
    </div>

    <RecommendationsShareDialog
      v-model:open="shareOpen"
      :title="sharing?.title ?? ''"
      :metric-label="sharing ? `${sharing.metric} by ${sharing.dimension}` : ''"
      :metric-value="sharing?.changePercent ?? 0"
      business-type="restaurant"
    />
  </div>
</template>
