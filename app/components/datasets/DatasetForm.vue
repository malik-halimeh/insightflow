<script setup lang="ts">
import {
  datasetCreateSchema,
  type DatasetCreate
} from '#shared/schemas'

import type { FormSubmitEvent } from '@nuxt/ui'


const props = defineProps<{
  dataset?: DatasetCreate
}>()


const emit = defineEmits<{
  submit: [data: DatasetCreate]
}>()


const BUSINESS_TYPES = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Shop', value: 'retail' },
  { label: 'Gym', value: 'gym' }
]


const today = new Date()
  .toISOString()
  .slice(0, 10)


const state = reactive<DatasetCreate>({
  name: '',
  businessType: 'restaurant',
  periodStart: today,
  periodEnd: today,
  notes: undefined
})


watch(
  () => props.dataset,
  (dataset) => {

    if(dataset){

      Object.assign(
        state,
        dataset
      )

    }

  },
  {
    immediate: true
  }
)



function onSubmit(
  event: FormSubmitEvent<DatasetCreate>
){

  emit(
    'submit',
    event.data
  )

}

</script>


<template>

<UForm
  :schema="datasetCreateSchema"
  :state="state"
  class="space-y-4"
  @submit="onSubmit"
>


<UFormField
  label="Name"
  name="name"
>

<UInput
  v-model="state.name"
  placeholder="Spring sales"
  class="w-full"
/>

</UFormField>



<UFormField
 label="Business type"
 name="businessType"
>

<USelect
 v-model="state.businessType"
 :items="BUSINESS_TYPES"
 class="w-full"
/>

</UFormField>



<div class="grid gap-4 sm:grid-cols-2">


<UFormField
 label="First day"
 name="periodStart"
>

<UInput
 v-model="state.periodStart"
 type="date"
 class="w-full"
/>

</UFormField>



<UFormField
 label="Last day"
 name="periodEnd"
>

<UInput
 v-model="state.periodEnd"
 type="date"
 class="w-full"
/>

</UFormField>


</div>



<UFormField
 label="Notes"
 name="notes"
 hint="Optional"
>

<UTextarea
 v-model="state.notes"
 :rows="3"
 placeholder="Anything worth remembering about this period."
 class="w-full"
/>

</UFormField>



<UButton type="submit">
Save data set
</UButton>


</UForm>

</template>