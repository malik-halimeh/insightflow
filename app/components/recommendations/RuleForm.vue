<script setup lang="ts">
import type {
  Dimension,
  Metric,
  Rule,
  RuleOperator
} from '#shared/schemas'

const props = defineProps<{
  rule?: Rule | null
}>()

const emit = defineEmits<{
  save: [{
    name: string
    metric: Metric
    dimension: Dimension
    operator: RuleOperator
    threshold: number
    advice: string
    enabled: boolean
  }]
  cancel: []
}>()

const name = ref('')
const metric = ref<Metric>('revenue')
const dimension = ref<Dimension>('dayOfWeek')
const operator = ref<RuleOperator>('above_average_by')
const threshold = ref(20)
const advice = ref('')
const enabled = ref(true)

watch(
  () => props.rule,
  (rule) => {
    name.value = rule?.name ?? ''
    metric.value = rule?.metric ?? 'revenue'
    dimension.value = rule?.dimension ?? 'dayOfWeek'
    operator.value = rule?.operator ?? 'above_average_by'
    threshold.value = rule?.threshold ?? 20
    advice.value = rule?.advice ?? ''
    enabled.value = rule?.enabled ?? true
  },
  { immediate: true }
)

function submit() {
  emit('save', {
    name: name.value,
    metric: metric.value,
    dimension: dimension.value,
    operator: operator.value,
    threshold: threshold.value,
    advice: advice.value,
    enabled: enabled.value
  })
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">
        {{ rule ? 'Edit rule' : 'Add rule' }}
      </h2>
    </template>

    <div class="space-y-4">
      <UFormField label="Name">
        <UInput
          v-model="name"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Metric">
        <USelect
          v-model="metric"
          class="w-full"
          :items="[
            { label: 'Revenue', value: 'revenue' },
            { label: 'Quantity', value: 'quantity' },
            { label: 'Orders', value: 'orders' }
          ]"
        />
      </UFormField>

      <UFormField label="Dimension">
        <USelect
          v-model="dimension"
          class="w-full"
          :items="[
            { label: 'Day of week', value: 'dayOfWeek' },
            { label: 'Item', value: 'item' },
            { label: 'Category', value: 'category' },
            { label: 'Hour', value: 'hour' }
          ]"
        />
      </UFormField>

      <UFormField label="Operator">
        <USelect
          v-model="operator"
          class="w-full"
          :items="[
            { label: 'Above average by', value: 'above_average_by' },
            { label: 'Below average by', value: 'below_average_by' },
            { label: 'Unsold for days', value: 'unsold_for_days' }
          ]"
        />
      </UFormField>

      <UFormField label="Threshold">
        <UInput
          v-model.number="threshold"
          type="number"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Advice">
        <UTextarea
          v-model="advice"
          class="w-full"
          :rows="4"
        />
      </UFormField>

      <UCheckbox
        v-model="enabled"
        label="Enabled"
      />

      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="subtle"
          @click="emit('cancel')"
        >
          Cancel
        </UButton>

        <UButton @click="submit">
          {{ rule ? 'Save changes' : 'Save rule' }}
        </UButton>
      </div>
    </div>
  </UCard>
</template>