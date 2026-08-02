<!--
  OWNER: M4 (recommendations and publishing)

  WHAT THIS IS
  A finished layout for the findings InsightFlow produces. Nothing here talks to a
  server. Each card carries four things, in this order: what we found, what to do
  about it, the number behind it, and how important it is.

  WHAT TO REPLACE
  1. `DEMO_RECOMMENDATIONS` — load the real list at the top level of the file.
  2. `demoState` and the dashed box — delete both, and drive the states from the
     real request instead.

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

const DEMO_STATES = [
  { label: 'Ready', value: 'ready' },
  { label: 'Loading', value: 'loading' },
  { label: 'Empty', value: 'empty' }
]
const demoState = ref<'ready' | 'loading' | 'empty'>('ready')

/** The action sentence is not part of the record schema yet — ask M1 before wiring. */
interface Finding extends Recommendation {
  action: string
}

const DEMO_RECOMMENDATIONS: Finding[] = [
  {
    id: '6a6d2789e5be8b2def8ad301',
    datasetId: '6a6d2789e5be8b2def8ad116',
    ruleId: '6a6d2789e5be8b2def8ad401',
    title: 'Fridays are your busiest night by a wide margin',
    body: 'Friday takings run well above every other night, and Saturday is close behind. Thursday is the last chance to order stock before that rush.',
    action: 'Move your stock order to Thursday morning so Friday never runs short.',
    metric: 'revenue',
    dimension: 'dayOfWeek',
    changePercent: 32.7,
    severity: 'opportunity',
    createdAt: '2026-07-31T18:22:00.000Z'
  },
  {
    id: '6a6d2789e5be8b2def8ad302',
    datasetId: '6a6d2789e5be8b2def8ad116',
    ruleId: '6a6d2789e5be8b2def8ad402',
    title: 'Tuesday is reliably your quietest night',
    body: 'Tuesday takings sit below the weekly average every single week in this period. It is the safest night to try something without risking a busy service.',
    action: 'Try a set menu on Tuesdays for a month, and keep one fewer person on.',
    metric: 'revenue',
    dimension: 'dayOfWeek',
    changePercent: -18.5,
    severity: 'opportunity',
    createdAt: '2026-07-31T18:22:00.000Z'
  },
  {
    id: '6a6d2789e5be8b2def8ad303',
    datasetId: '6a6d2789e5be8b2def8ad116',
    ruleId: null,
    title: 'Beetroot & Feta Salad has almost stopped selling',
    body: 'Fifteen sold in eight weeks, on fifteen separate days. It still takes up space on the menu and stock in the fridge.',
    action: 'Drop it from the menu, or replace it with a side that shares ingredients you already hold.',
    metric: 'quantity',
    dimension: 'item',
    changePercent: -41.2,
    severity: 'warning',
    createdAt: '2026-07-31T18:22:00.000Z'
  },
  {
    id: '6a6d2789e5be8b2def8ad304',
    datasetId: '6a6d2789e5be8b2def8ad116',
    ruleId: null,
    title: 'House Fries outsell every main course',
    body: 'Your cheapest side sells more units than anything else on the menu, week after week. It is doing a lot of work at a low price.',
    action: 'Check the margin on fries before your next price review — a small rise reaches more customers than a rise anywhere else.',
    metric: 'quantity',
    dimension: 'item',
    changePercent: 14.2,
    severity: 'info',
    createdAt: '2026-07-31T18:22:00.000Z'
  }
]

const recommendations = computed(() => (demoState.value === 'ready' ? DEMO_RECOMMENDATIONS : []))

// Icon and word travel with the colour, so the meaning survives without it.
const SEVERITY: Record<Severity, { label: string, icon: string, color: 'info' | 'success' | 'warning' }> = {
  info: { label: 'Information', icon: 'i-lucide-info', color: 'info' },
  opportunity: { label: 'Opportunity', icon: 'i-lucide-lightbulb', color: 'success' },
  warning: { label: 'Worth watching', icon: 'i-lucide-triangle-alert', color: 'warning' }
}

const shareOpen = ref(false)
const sharing = ref<Finding | null>(null)

function openShare(finding: Finding) {
  sharing.value = finding
  shareOpen.value = true
}
</script>

<template>
  <div>
    <!-- Scaffolding: delete this box and `demoState` when you wire real data. -->
    <div class="mb-8 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-default p-3">
      <span class="text-xs text-muted">Preview state</span>
      <USelect v-model="demoState" :items="DEMO_STATES" size="xs" class="w-32" />
    </div>

    <UiPageHeader title="Recommendations" description="What your sales data is telling you.">
      <template #actions>
        <UButton to="/recommendations/rules" color="neutral" variant="subtle" icon="i-lucide-sliders-horizontal">
          Rules
        </UButton>
      </template>
    </UiPageHeader>

    <!-- Loading -->
    <div v-if="demoState === 'loading'" class="space-y-4">
      <USkeleton v-for="card in 3" :key="card" class="h-40 w-full" />
    </div>

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
          </div>
        </template>
      </UCard>
    </div>

    <RecommendationsShareDialog
      v-model:open="shareOpen"
      :title="sharing?.title ?? ''"
      :metric-label="sharing ? `${sharing.metric} by ${sharing.dimension}` : ''"
      :metric-value="sharing?.changePercent ?? 0"
    />
  </div>
</template>
