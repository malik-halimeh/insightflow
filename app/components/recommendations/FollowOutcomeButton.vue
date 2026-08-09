<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { outcomeCreateSchema, type OutcomeCreate } from '#shared/schemas'

const props = defineProps<{
  recommendationId: string
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  follow: [OutcomeCreate]
}>()

const open = ref(false)
const formId = useId()
const state = reactive<OutcomeCreate>({
  recommendationId: props.recommendationId,
  followedDate: new Date().toISOString().slice(0, 10),
  note: ''
})

function submit(event: FormSubmitEvent<OutcomeCreate>) {
  emit('follow', event.data)
}
</script>

<template>
  <UModal v-model:open="open" title="Record that you followed this advice">
    <UButton icon="i-lucide-check">
      I followed this
    </UButton>

    <template #body>
      <UForm
        :id="formId"
        :schema="outcomeCreateSchema"
        :state="state"
        class="space-y-4"
        @submit="submit"
      >
        <UAlert
          v-if="serverError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="serverError"
        />

        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-calendar-days"
          title="InsightFlow will save the starting point"
          description="The two weeks before the date below become the fixed baseline. After another two weeks, InsightFlow compares the same measure and scope."
        />

        <UFormField label="Date followed" name="followedDate">
          <UInput
            v-model="state.followedDate"
            type="date"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Note" name="note" hint="Optional">
          <UTextarea
            v-model="state.note"
            :rows="3"
            :maxlength="500"
            placeholder="What did you change?"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full flex-wrap justify-end gap-2">
        <UButton color="neutral" variant="subtle" @click="open = false">
          Cancel
        </UButton>
        <UButton
          type="submit"
          :form="formId"
          icon="i-lucide-check"
          :loading="loading"
        >
          Record outcome
        </UButton>
      </div>
    </template>
  </UModal>
</template>
