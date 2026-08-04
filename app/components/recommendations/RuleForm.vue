<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  ruleCreateSchema,
  type Rule,
  type RuleCreate
} from '#shared/schemas'

const props = defineProps<{
  rule?: Rule | null
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  save: [RuleCreate]
  cancel: []
}>()

const state = reactive<RuleCreate>({
  name: '',
  metric: 'revenue',
  dimension: 'dayOfWeek',
  operator: 'above_average_by',
  threshold: 20,
  advice: '',
  enabled: true
})

watch(
  () => props.rule,
  (rule) => {
    Object.assign(state, {
      name: rule?.name ?? '',
      metric: rule?.metric ?? 'revenue',
      dimension: rule?.dimension ?? 'dayOfWeek',
      operator: rule?.operator ?? 'above_average_by',
      threshold: rule?.threshold ?? 20,
      advice: rule?.advice ?? '',
      enabled: rule?.enabled ?? true
    })
  },
  { immediate: true }
)

function submit(event: FormSubmitEvent<RuleCreate>) {
  emit('save', event.data)
}
</script>

<template>
  <UForm
    :schema="ruleCreateSchema"
    :state="state"
    @submit="submit"
  >
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          {{ rule ? 'Edit rule' : 'Add rule' }}
        </h2>
      </template>

      <div class="space-y-4">
        <UAlert
          v-if="serverError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="serverError"
        />

        <UFormField label="Name" name="name">
          <UInput
            v-model="state.name"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Metric" name="metric">
          <USelect
            v-model="state.metric"
            class="w-full"
            :items="[
              { label: 'Revenue', value: 'revenue' },
              { label: 'Quantity', value: 'quantity' },
              { label: 'Orders', value: 'orders' }
            ]"
          />
        </UFormField>

        <UFormField label="Dimension" name="dimension">
          <USelect
            v-model="state.dimension"
            class="w-full"
            :items="[
              { label: 'Day of week', value: 'dayOfWeek' },
              { label: 'Item', value: 'item' },
              { label: 'Category', value: 'category' },
              { label: 'Hour', value: 'hour' }
            ]"
          />
        </UFormField>

        <UFormField label="Operator" name="operator">
          <USelect
            v-model="state.operator"
            class="w-full"
            :items="[
              { label: 'Above average by', value: 'above_average_by' },
              { label: 'Below average by', value: 'below_average_by' },
              { label: 'Unsold for days', value: 'unsold_for_days' }
            ]"
          />
        </UFormField>

        <UFormField label="Threshold" name="threshold">
          <UInput
            v-model.number="state.threshold"
            type="number"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Advice" name="advice">
          <UTextarea
            v-model="state.advice"
            class="w-full"
            :rows="4"
          />
        </UFormField>

        <UCheckbox
          v-model="state.enabled"
          label="Enabled"
        />

        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            color="neutral"
            variant="subtle"
            @click="emit('cancel')"
          >
            Cancel
          </UButton>

          <UButton type="submit" :loading="loading">
            {{ rule ? 'Save changes' : 'Save rule' }}
          </UButton>
        </div>
      </div>
    </UCard>
  </UForm>
</template>
