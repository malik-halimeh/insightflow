<!--
  OWNER: M4 (recommendations and publishing)

  The publish button and its dialog. This replaces the earlier ShareDialog, which
  asked for the same three fields. Two components doing one job would have
  drifted apart within a week.

  WHY THE PREVIEW IS HERE
  This publishes to the open internet, where anyone can read it without an
  account. Nobody should discover what they published by looking at it afterwards,
  so the preview shows exactly what a stranger sees and updates as they type.

  WHY "HIDE MY ACTUAL FIGURES" IS ON BY DEFAULT
  An owner sharing "Fridays are 34% busier" is telling a story. The same owner
  publishing their takings is telling their landlord and their competitors what
  they earn. The safe option is the default; turning it off is a deliberate act.

  The form and the endpoint both use publishedInsightCreateSchema. The page owns
  the request so it can update every card from one persistent publish-state query.
-->

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  publishedInsightCreateSchema,
  type PublishedInsightCreate
} from '#shared/schemas'

const props = defineProps<{
  recommendationId: string
  /** The finding being published. Prefills the caption and drives the preview. */
  title: string
  /** What the number measures, e.g. "revenue by day of week". */
  metricLabel: string
  /** The percentage change behind the finding. */
  metricValue: number
  loading?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  publish: [PublishedInsightCreate]
}>()

const open = ref(false)
const formId = useId()

const form = reactive<PublishedInsightCreate>({
  displayName: '',
  caption: '',
  hideAbsoluteNumbers: true,
  recommendationId: props.recommendationId
})

const CAPTION_LIMIT = 280

// Start from the finding so the owner edits rather than facing a blank box.
watch(open, (isOpen) => {
  if (isOpen && !form.caption) form.caption = props.title
})

function publish(event: FormSubmitEvent<PublishedInsightCreate>) {
  emit('publish', event.data)
}
</script>

<template>
  <UModal v-model:open="open" title="Publish this insight">
    <!-- Quiet on purpose: the recommendation is what the owner came for. -->
    <UButton color="neutral" variant="ghost" icon="i-lucide-share-2">
      Share
    </UButton>

    <template #body>
      <UForm
        :id="formId"
        :schema="publishedInsightCreateSchema"
        :state="form"
        class="space-y-8"
        @submit="publish"
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
          icon="i-lucide-globe"
          title="Anyone will be able to read this"
          description="Published insights appear on a public page that needs no account. You can unpublish later, but assume it has already been seen."
        />

        <div class="space-y-4">
          <UFormField label="Shown as" name="displayName" hint="Required">
            <UInput v-model="form.displayName" placeholder="Bella Pizza" class="w-full" />
          </UFormField>

          <UFormField label="Caption" name="caption">
            <UTextarea
              v-model="form.caption"
              :rows="3"
              :maxlength="CAPTION_LIMIT"
              placeholder="Tuesdays are our quietest night, so that is when we try new dishes."
              class="w-full"
            />
            <template #help>
              <span class="text-xs text-muted">
                {{ form.caption.length }} / {{ CAPTION_LIMIT }}
              </span>
            </template>
          </UFormField>

          <UCheckbox
            v-model="form.hideAbsoluteNumbers"
            label="Hide my actual figures"
            description="Publish the change as a percentage only. Your takings stay private."
          />
        </div>

        <USeparator label="What people will see" />

        <div class="border border-default p-4">
          <p class="text-sm font-semibold">
            {{ form.displayName || 'Your business name' }}
          </p>

          <p class="mt-4 text-sm">
            {{ form.caption || 'Your caption appears here.' }}
          </p>

          <div class="mt-4 flex flex-wrap items-baseline gap-2">
            <UiChangeIndicator :value="metricValue" />
            <span class="text-sm text-muted">{{ metricLabel }}</span>
          </div>

          <p v-if="form.hideAbsoluteNumbers" class="mt-4 text-xs text-muted">
            Your actual takings are hidden. Only the change is published.
          </p>
          <p v-else class="mt-4 text-xs text-muted">
            Your actual takings will be published alongside this.
          </p>
        </div>
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
          icon="i-lucide-globe"
          :loading="loading"
        >
          Publish
        </UButton>
      </div>
    </template>
  </UModal>
</template>
