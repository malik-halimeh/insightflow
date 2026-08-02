<!--
  OWNER: M4 (recommendations and publishing)

  WHAT THIS IS
  The rule builder. Nothing here talks to a server.

  WHY IT IS A SENTENCE AND NOT A FORM
  A rule is one thought: "when revenue by day of week is below average by 15%,
  advise the owner to try something." Split across five labelled fields, an owner
  has to reassemble that thought in their head to check it is right. Written as a
  sentence with gaps, they read it back and simply see whether it says what they
  meant.

  HOW IT SURVIVES 360px
  The sentence is a wrapping flex row, not a grid. The words and the controls wrap
  like text, so on a narrow phone it becomes several lines of a sentence rather
  than a broken layout. `gap-y-3` keeps the lines from touching once they wrap.
  Do not switch this to a grid or to stacked labels — that is the form it exists
  to avoid.

  WHAT TO REPLACE
  1. `DEMO_RULES` — load the real list.
  2. `demoState` and the dashed box — delete both.
  3. `onSaveRule` and `onToggle` — call your endpoints with `$fetch`.

  WHAT NOT TO CHANGE
  - The unit after the threshold changes with the operator: a percentage for the
    average comparisons, days for "unsold for". A rule that reads "unsold for 14%"
    is nonsense.
  - The "matches nothing" note. A rule that quietly matches nothing looks identical
    to a rule that is working, and an owner will wait forever for a finding that
    cannot arrive.
  - The class names. They come from docs/DESIGN-SYSTEM.md.
-->

<script setup lang="ts">
import type { Dimension, Metric, Rule, RuleOperator } from '#shared/schemas'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Rules — InsightFlow' })

const DEMO_STATES = [
  { label: 'Ready', value: 'ready' },
  { label: 'Loading', value: 'loading' },
  { label: 'No rules yet', value: 'empty' }
]
const demoState = ref<'ready' | 'loading' | 'empty'>('ready')

const METRICS = [
  { label: 'revenue', value: 'revenue' },
  { label: 'quantity sold', value: 'quantity' },
  { label: 'orders', value: 'orders' }
]

const DIMENSIONS = [
  { label: 'day of week', value: 'dayOfWeek' },
  { label: 'item', value: 'item' },
  { label: 'category', value: 'category' },
  { label: 'hour', value: 'hour' }
]

const OPERATORS = [
  { label: 'above average by', value: 'above_average_by' },
  { label: 'below average by', value: 'below_average_by' },
  { label: 'unsold for', value: 'unsold_for_days' }
]

const draft = reactive<{
  metric: Metric
  dimension: Dimension
  operator: RuleOperator
  threshold: number
  advice: string
}>({
  metric: 'revenue',
  dimension: 'dayOfWeek',
  operator: 'below_average_by',
  threshold: 15,
  advice: ''
})

// "unsold for 14%" is nonsense. The unit follows the operator.
const unit = computed(() => (draft.operator === 'unsold_for_days' ? 'days' : '%'))

/** `matchCount` is not on the Rule schema — ask M1 before wiring this up. */
interface RuleRow extends Rule {
  matchCount: number
}

const DEMO_RULES: RuleRow[] = [
  {
    id: '6a6d2789e5be8b2def8ad401',
    name: 'Quiet nights',
    metric: 'revenue',
    dimension: 'dayOfWeek',
    operator: 'below_average_by',
    threshold: 15,
    advice: 'Try a set menu on this night and keep one fewer person on.',
    enabled: true,
    matchCount: 2
  },
  {
    id: '6a6d2789e5be8b2def8ad402',
    name: 'Busy nights',
    metric: 'revenue',
    dimension: 'dayOfWeek',
    operator: 'above_average_by',
    threshold: 25,
    advice: 'Order stock the day before so this night never runs short.',
    enabled: true,
    matchCount: 2
  },
  {
    id: '6a6d2789e5be8b2def8ad403',
    name: 'Dead stock',
    metric: 'quantity',
    dimension: 'item',
    operator: 'unsold_for_days',
    threshold: 14,
    advice: 'Drop this item from the menu or replace it with something similar.',
    enabled: true,
    matchCount: 1
  },
  {
    // Matches nothing: the threshold is far higher than anything in the data.
    id: '6a6d2789e5be8b2def8ad404',
    name: 'Huge weekly swings',
    metric: 'revenue',
    dimension: 'dayOfWeek',
    operator: 'above_average_by',
    threshold: 80,
    advice: 'Look into what happened on this day before repeating it.',
    enabled: true,
    matchCount: 0
  },
  {
    id: '6a6d2789e5be8b2def8ad405',
    name: 'Slow hours',
    metric: 'orders',
    dimension: 'hour',
    operator: 'below_average_by',
    threshold: 40,
    advice: 'Consider opening an hour later on weekdays.',
    enabled: false,
    matchCount: 0
  }
]

const rules = computed(() => (demoState.value === 'ready' ? DEMO_RULES : []))

function labelFor(items: { label: string, value: string }[], value: string): string {
  return items.find(item => item.value === value)?.label ?? value
}

function sentenceFor(rule: RuleRow): string {
  const suffix = rule.operator === 'unsold_for_days' ? 'days' : '%'
  return `When ${labelFor(METRICS, rule.metric)} by ${labelFor(DIMENSIONS, rule.dimension)} is ${labelFor(OPERATORS, rule.operator)} ${rule.threshold}${suffix}`
}

function onSaveRule() {
  // M4: save the draft, then add it to the list.
}

function onToggle() {
  // M4: persist the enabled flag.
}
</script>

<template>
  <div>
    <!-- Scaffolding: delete this box and `demoState` when you wire real data. -->
    <div class="mb-8 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-default p-3">
      <span class="text-xs text-muted">Preview state</span>
      <USelect v-model="demoState" :items="DEMO_STATES" size="xs" class="w-36" />
    </div>

    <UiPageHeader title="Rules" description="What InsightFlow should look for in your sales.">
      <template #actions>
        <UButton to="/recommendations" color="neutral" variant="subtle" icon="i-lucide-arrow-left">
          Recommendations
        </UButton>
      </template>
    </UiPageHeader>

    <!-- The builder: one sentence with gaps in it. -->
    <UCard class="mb-8">
      <template #header>
        <h2 class="text-base font-semibold">
          New rule
        </h2>
        <p class="mt-1 text-sm text-muted">
          Read it back to yourself. If the sentence is true, the rule is right.
        </p>
      </template>

      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-3 text-base">
          <span>When</span>
          <USelect v-model="draft.metric" :items="METRICS" class="w-40" />
          <span>by</span>
          <USelect v-model="draft.dimension" :items="DIMENSIONS" class="w-36" />
          <span>is</span>
          <USelect v-model="draft.operator" :items="OPERATORS" class="w-44" />
          <UInput v-model.number="draft.threshold" type="number" min="1" class="w-24" />
          <span>{{ unit }},</span>
          <span>advise:</span>
        </div>

        <UFormField name="advice">
          <UTextarea
            v-model="draft.advice"
            :rows="2"
            placeholder="Try a set menu on this night and keep one fewer person on."
            class="w-full"
          />
        </UFormField>

        <UButton icon="i-lucide-plus" @click="onSaveRule">
          Add rule
        </UButton>
      </div>
    </UCard>

    <!-- Loading -->
    <div v-if="demoState === 'loading'" class="space-y-3">
      <USkeleton v-for="row in 4" :key="row" class="h-20 w-full" />
    </div>

    <!-- Empty -->
    <UiEmptyState
      v-else-if="rules.length === 0"
      icon="i-lucide-sliders-horizontal"
      title="No rules yet"
      description="Add your first rule above. InsightFlow checks every rule against your sales each time you upload."
    />

    <!-- Ready -->
    <div v-else class="space-y-3">
      <h2 class="text-base font-semibold">
        Your rules
      </h2>

      <UCard v-for="rule in rules" :key="rule.id">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-semibold">
                {{ rule.name }}
              </h3>

              <UBadge v-if="!rule.enabled" color="neutral" variant="subtle" size="sm">
                Off
              </UBadge>

              <!--
                A rule matching nothing looks exactly like one that works.
                Say so, and say what to do about it.
              -->
              <UBadge
                v-else-if="rule.matchCount === 0"
                color="warning"
                variant="subtle"
                size="sm"
                icon="i-lucide-search-x"
              >
                Matches nothing
              </UBadge>

              <UBadge v-else color="neutral" variant="subtle" size="sm">
                {{ rule.matchCount }} {{ rule.matchCount === 1 ? 'finding' : 'findings' }}
              </UBadge>
            </div>

            <p class="text-sm text-muted">
              {{ sentenceFor(rule) }}
            </p>

            <p class="text-sm">
              {{ rule.advice }}
            </p>

            <p v-if="rule.enabled && rule.matchCount === 0" class="text-sm text-muted">
              Nothing in your sales reaches this threshold. Lower it and the rule
              starts finding things.
            </p>
          </div>

          <USwitch
            :model-value="rule.enabled"
            :aria-label="`Turn ${rule.name} ${rule.enabled ? 'off' : 'on'}`"
            @update:model-value="onToggle"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
