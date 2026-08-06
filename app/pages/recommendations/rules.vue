<!--
  OWNER: M4 (recommendations and publishing)

  WHAT THIS IS
  The rule builder, wired to `/api/rules` (backed by the `rules` collection in
  MongoDB). Full CRUD: creating a rule POSTs, toggling PATCHes, and there is no
  delete button by design — disable a rule instead of removing your own history
  of why it existed.

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

  WHAT NOT TO CHANGE
  - The unit after the threshold changes with the operator: a percentage for the
    average comparisons, days for "unsold for". A rule that reads "unsold for 14%"
    is nonsense.
  - The class names. They come from docs/DESIGN-SYSTEM.md.
-->

<script setup lang="ts">
import type { Dimension, Metric, Rule, RuleOperator } from '#shared/schemas'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Rules — InsightFlow' })

const {
  data: rules,
  status,
  error,
  refresh
} = await useFetch('/api/rules', {
  default: (): Rule[] => []
})

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
  name: string
  metric: Metric
  dimension: Dimension
  operator: RuleOperator
  threshold: number
  advice: string
}>({
  name: '',
  metric: 'revenue',
  dimension: 'dayOfWeek',
  operator: 'below_average_by',
  threshold: 15,
  advice: ''
})

// "unsold for 14%" is nonsense. The unit follows the operator.
const unit = computed(() => (draft.operator === 'unsold_for_days' ? 'days' : '%'))

function labelFor(items: { label: string, value: string }[], value: string): string {
  return items.find(item => item.value === value)?.label ?? value
}

function sentenceFor(rule: Rule): string {
  const suffix = rule.operator === 'unsold_for_days' ? 'days' : '%'
  return `When ${labelFor(METRICS, rule.metric)} by ${labelFor(DIMENSIONS, rule.dimension)} is ${labelFor(OPERATORS, rule.operator)} ${rule.threshold}${suffix}`
}

const saving = ref(false)
const toggling = ref<string | null>(null)
const toast = useToast()

async function onSaveRule() {
  if (!draft.name.trim() || !draft.advice.trim()) {
    toast.add({
      title: 'Please fill in a name and some advice before saving.',
      color: 'warning'
    })
    return
  }

  saving.value = true
  try {
    await $fetch('/api/rules', {
      method: 'POST',
      body: {
        name: draft.name,
        metric: draft.metric,
        dimension: draft.dimension,
        operator: draft.operator,
        threshold: draft.threshold,
        advice: draft.advice,
        enabled: true
      }
    })
    toast.add({ title: 'Rule added', color: 'success' })
    draft.name = ''
    draft.advice = ''
    draft.threshold = 15
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Could not save this rule',
      description: (err as { statusMessage?: string }).statusMessage ?? 'Please try again.',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function onToggle(rule: Rule, enabled: boolean) {
  toggling.value = rule.id
  try {
    await $fetch(`/api/rules/${rule.id}`, { method: 'PATCH', body: { enabled } })
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Could not update this rule',
      description: (err as { statusMessage?: string }).statusMessage ?? 'Please try again.',
      color: 'error'
    })
  } finally {
    toggling.value = null
  }
}

async function onDeleteRule(rule: Rule) {
  toggling.value = rule.id
  try {
    await $fetch(`/api/rules/${rule.id}`, { method: 'DELETE' })
    toast.add({ title: 'Rule removed', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Could not remove this rule',
      description: (err as { statusMessage?: string }).statusMessage ?? 'Please try again.',
      color: 'error'
    })
  } finally {
    toggling.value = null
  }
}
</script>

<template>
  <div>
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
        <UFormField label="Rule name" name="name">
          <UInput v-model="draft.name" placeholder="Quiet nights" class="w-full sm:w-64" />
        </UFormField>

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

        <UButton icon="i-lucide-plus" :loading="saving" @click="onSaveRule">
          Add rule
        </UButton>
      </div>
    </UCard>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-3">
      <USkeleton v-for="row in 4" :key="row" class="h-20 w-full" />
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="We could not load your rules"
      description="Please refresh the page and try again."
    />

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
            </div>

            <p class="text-sm text-muted">
              {{ sentenceFor(rule) }}
            </p>

            <p class="text-sm">
              {{ rule.advice }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <USwitch
              :model-value="rule.enabled"
              :loading="toggling === rule.id"
              :aria-label="`Turn ${rule.name} ${rule.enabled ? 'off' : 'on'}`"
              @update:model-value="(value: boolean) => onToggle(rule, value)"
            />
            <UButton
              color="error"
              variant="ghost"
              size="xs"
              icon="i-lucide-trash-2"
              :loading="toggling === rule.id"
              @click="onDeleteRule(rule)"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
