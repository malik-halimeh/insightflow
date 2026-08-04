<script setup lang="ts">
import type { Rule } from '#shared/schemas'

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

useSeoMeta({ title: 'Rules — InsightFlow' })

const {
  data: rules,
  status,
  error,
  refresh
} = await useFetch('/api/recommendations/rules', {
  default: (): Rule[] => []
})

const showForm = ref(false)
const editingRule = ref<Rule | null>(null)
const deletingId = ref<string | null>(null)
const serverError = ref<string | null>(null)

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

function labelFor(items: { label: string, value: string }[], value: string): string {
  return items.find(item => item.value === value)?.label ?? value
}

function sentenceFor(rule: Rule): string {
  const suffix = rule.operator === 'unsold_for_days' ? ' days' : '%'
  return `When ${labelFor(METRICS, rule.metric)} by ${labelFor(DIMENSIONS, rule.dimension)} is ${labelFor(OPERATORS, rule.operator)} ${rule.threshold}${suffix}`
}

function openCreateForm() {
  editingRule.value = null
  showForm.value = true
}

function openEditForm(rule: Rule) {
  editingRule.value = rule
  showForm.value = true
}

function closeForm() {
  editingRule.value = null
  showForm.value = false
}

function handleSave() {
  closeForm()
}

// A browser confirm cannot be styled, blocks the page, and says the same thing
// whatever is being deleted. This one names what actually happens.
const deleteOpen = ref(false)
const pendingDelete = ref<Rule | null>(null)

function askToDelete(rule: Rule) {
  pendingDelete.value = rule
  deleteOpen.value = true
}

async function removeRule() {
  const rule = pendingDelete.value
  if (!rule) return

  deleteOpen.value = false
  deletingId.value = rule.id
  serverError.value = null

  try {
    await $fetch(`/api/recommendations/rules/${rule.id}`, {
      method: 'DELETE'
    })

    await refresh()
  } catch (error) {
    serverError.value = (error as { statusMessage?: string }).statusMessage
      ?? 'The rule could not be deleted. Please try again.'
  } finally {
    deletingId.value = null
    pendingDelete.value = null
  }
}
</script>

<template>
  <div class="space-y-8">
    <UiPageHeader
      title="Rules"
      description="What InsightFlow should look for in your sales."
    >
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <UButton
            to="/recommendations"
            color="neutral"
            variant="subtle"
            icon="i-lucide-arrow-left"
          >
            Recommendations
          </UButton>

          <UButton
            icon="i-lucide-plus"
            @click="openCreateForm"
          >
            Add rule
          </UButton>
        </div>
      </template>
    </UiPageHeader>

    <UAlert
      v-if="serverError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="serverError"
    />

    <RuleForm
      v-if="showForm"
      :rule="editingRule"
      @save="handleSave"
      @cancel="closeForm"
    />

    <div
      v-if="status === 'pending'"
      class="space-y-3"
    >
      <USkeleton
        v-for="row in 4"
        :key="row"
        class="h-24 w-full"
      />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Rules could not be loaded"
      description="Check your connection and try again."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-rotate-ccw"
          @click="() => refresh()"
        >
          Try again
        </UButton>
      </template>
    </UAlert>

    <UiEmptyState
      v-else-if="rules.length === 0"
      icon="i-lucide-sliders-horizontal"
      title="No rules yet"
      description="Add your first rule. InsightFlow checks every rule against your sales each time you upload."
    >
      <template #action>
        <UButton
          icon="i-lucide-plus"
          @click="openCreateForm"
        >
          Add rule
        </UButton>
      </template>
    </UiEmptyState>

    <section
      v-else
      class="space-y-3"
    >
      <h2 class="text-base font-semibold">
        Your rules
      </h2>

      <UCard
        v-for="rule in rules"
        :key="rule.id"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-semibold">
                {{ rule.name }}
              </h3>

              <UBadge
                :color="rule.enabled ? 'success' : 'neutral'"
                variant="subtle"
                size="sm"
              >
                {{ rule.enabled ? 'On' : 'Off' }}
              </UBadge>
            </div>

            <p class="text-sm text-muted">
              {{ sentenceFor(rule) }}
            </p>

            <p class="text-sm">
              {{ rule.advice }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-pencil"
              @click="openEditForm(rule)"
            >
              Edit
            </UButton>

            <UButton
              color="error"
              variant="subtle"
              icon="i-lucide-trash-2"
              :loading="deletingId === rule.id"
              @click="askToDelete(rule)"
            >
              Delete
            </UButton>
          </div>
        </div>
      </UCard>
    </section>

    <UModal v-model:open="deleteOpen" title="Delete this rule?">
      <template #body>
        <div v-if="pendingDelete" class="space-y-3 text-sm">
          <p>
            <strong>{{ pendingDelete.name }}</strong> will stop looking for:
          </p>
          <p class="text-muted">
            {{ sentenceFor(pendingDelete) }}
          </p>
          <p>
            Findings this rule has already produced stay on your recommendations
            page. Only the rule itself is removed, and it will not run again.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="subtle" @click="deleteOpen = false">
            Keep it
          </UButton>
          <UButton color="error" @click="removeRule">
            Delete rule
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
