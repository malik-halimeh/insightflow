<script setup lang="ts">
import { datasetSchema } from '#shared/schemas/dataset'

// Form state matching the dataset schema fields
const state = reactive({
  id: 'ds_' + Math.random().toString(36).substring(2, 9),
  name: '',
  businessType: 'restaurant',
  periodStart: new Date().toISOString().split('T')[0],
  periodEnd: new Date().toISOString().split('T')[0],
  rowCount: 0,
  currentVersionId: null,
  notes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

// Handle form submission using $fetch (per Nuxt guidelines)
async function onSubmit(event: any) {
  try {
    console.log('Submitting valid dataset:', event.data)
    alert('Form validation passed!')
  } catch (err) {
    console.error('Submission error:', err)
  }
}
</script>

<template>
  <div class="p-6 max-w-xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Create New Dataset</h1>

    <!-- Nuxt UI Form connected to Member 1's Zod Schema -->
    <UForm :schema="datasetSchema" :state="state" class="space-y-4" @submit="onSubmit">
      
      <UFormField label="Dataset Name" name="name">
        <UInput v-model="state.name" placeholder="e.g. Q1 Restaurant Sales" />
      </UFormField>

      <UFormField label="Business Type" name="businessType">
        <USelect 
          v-model="state.businessType" 
          :items="[
            { label: 'Restaurant', value: 'restaurant' },
            { label: 'Retail', value: 'retail' },
            { label: 'Gym', value: 'gym' }
          ]" 
        />
      </UFormField>

      <UFormField label="Notes" name="notes">
        <UTextarea v-model="state.notes" placeholder="Optional notes (max 500 characters)" />
      </UFormField>

      <UButton type="submit" color="primary">Submit Dataset</UButton>
    </UForm>
  </div>
</template>