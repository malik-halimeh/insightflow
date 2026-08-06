<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

// Schema is intentionally local: this page is a throwaway probe with no server
// counterpart, so there is no rule to share via shared/schemas/.
const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ name: '' })
const submitted = ref<string | null>(null)

function onSubmit(event: FormSubmitEvent<Schema>) {
  submitted.value = event.data.name
}
</script>

<template>
  <div class="p-8 max-w-md">
    <h1 class="text-xl font-semibold mb-4">
      Nuxt UI + Zod stack check
    </h1>

    <UForm
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField label="Name" name="name">
        <UInput v-model="state.name" placeholder="Type fewer than 3 characters" />
      </UFormField>

      <UButton type="submit">
        Submit
      </UButton>
    </UForm>

    <p v-if="submitted" class="mt-4 text-sm">
      Submitted: {{ submitted }}
    </p>
  </div>
</template>
