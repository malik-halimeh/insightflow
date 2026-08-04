<script setup lang="ts">
import type { Rule } from '#shared/schemas'

definePageMeta({
  middleware: 'auth',
  layout: 'app'
})

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

async function removeRule(rule: Rule) {
  const confirmed = window.confirm(
    `Delete "${rule.name}"? This action cannot be undone.`
  )

  if (!confirmed) {
    return
  }

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
  }
}
</script>

<template>
  <div class="space-y-8">
    <UiPageHeader
      title="Rules"
      description="Manage the rules InsightFlow uses to generate recommendations."
    >
      <template #actions>
        <UButton @click="openCreateForm">
          Add rule
        </UButton>
      </template>
    </UiPageHeader>

    <UAlert
      v-if="serverError"
      color="error"
      variant="subtle"
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
      class="grid gap-4"
    >
      <USkeleton class="h-32 w-full" />
      <USkeleton class="h-32 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      title="Rules could not be loaded"
      description="Check your connection and try again."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="subtle"
          @click="() => refresh()"
        >
          Try again
        </UButton>
      </template>
    </UAlert>

    <UiEmptyState
      v-else-if="rules.length === 0"
      title="No saved rules yet"
      description="Create a rule so InsightFlow can generate advice from your sales patterns."
    >
      <template #action>
        <UButton @click="openCreateForm">
          Add rule
        </UButton>
      </template>
    </UiEmptyState>

    <section
      v-else
      class="space-y-4"
    >
      <h2 class="text-base font-semibold">
        Saved rules
      </h2>

      <div class="grid gap-4">
        <UCard
          v-for="rule in rules"
          :key="rule.id"
        >
          <template #header>
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-lg font-semibold">
                  {{ rule.name }}
                </h2>

                <p class="mt-2 text-xs text-muted">
                  {{ rule.metric }} · {{ rule.dimension }} · {{ rule.operator }}
                </p>
              </div>

              <UBadge :color="rule.enabled ? 'success' : 'neutral'">
                {{ rule.enabled ? 'Enabled' : 'Disabled' }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <p class="text-sm">
              {{ rule.advice }}
            </p>

            <p class="text-xs text-muted">
              Threshold: {{ rule.threshold }}
            </p>

            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="subtle"
                @click="openEditForm(rule)"
              >
                Edit rule
              </UButton>

              <UButton
                color="error"
                :loading="deletingId === rule.id"
                @click="removeRule(rule)"
              >
                Delete rule
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </section>
  </div>
</template>