<script setup lang="ts">
import { datasetCreateSchema, type DatasetCreate } from '#shared/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ middleware: 'auth', layout: 'app' })

useSeoMeta({ title: 'New data set — InsightFlow' })

const BUSINESS_TYPES = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Shop', value: 'retail' },
  { label: 'Gym', value: 'gym' }
]

const today = new Date().toISOString().slice(0, 10)

const state = reactive<DatasetCreate>({
  name: '',
  businessType: 'restaurant',
  periodStart: today,
  periodEnd: today,
  notes: undefined
})

const serverError = ref<string | null>(null)
const pending = ref(false)

async function onSubmit(event: FormSubmitEvent<DatasetCreate>) {
  serverError.value = null
  pending.value = true

  try {
    const created = await $fetch('/api/datasets', { method: 'POST', body: event.data })
    await navigateTo(`/datasets?created=${created.id}`)
  } catch (error) {
    serverError.value = (error as { statusMessage?: string }).statusMessage
      ?? 'We could not save this data set. Please try again.'
    pending.value = false
  }
}
</script>

<template>
  <div class="max-w-xl">
    <UiPageHeader
      title="New data set"
      description="Tell us what this data covers. You can upload the sales rows next."
    />

    <UForm
      :schema="datasetCreateSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UAlert
        v-if="serverError"
        color="error"
        variant="subtle"
        :description="serverError"
      />

      <UFormField label="Name" name="name">
        <UInput v-model="state.name" placeholder="Spring sales" class="w-full" />
      </UFormField>

      <UFormField label="Business type" name="businessType">
        <USelect v-model="state.businessType" :items="BUSINESS_TYPES" class="w-full" />
      </UFormField>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="First day" name="periodStart">
          <UInput v-model="state.periodStart" type="date" class="w-full" />
        </UFormField>

        <UFormField label="Last day" name="periodEnd">
          <UInput v-model="state.periodEnd" type="date" class="w-full" />
        </UFormField>
      </div>

      <UFormField label="Notes" name="notes" hint="Optional">
        <UTextarea
          v-model="state.notes"
          :rows="3"
          placeholder="Anything worth remembering about this period."
          class="w-full"
        />
      </UFormField>

      <div class="flex gap-2">
        <UButton type="submit" :loading="pending">
          Save data set
        </UButton>
        <UButton to="/datasets" color="neutral" variant="subtle">
          Cancel
        </UButton>
      </div>
    </UForm>
  </div>
</template>
