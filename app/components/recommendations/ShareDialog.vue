<!--
  OWNER: M4 (recommendations and publishing)

  WHAT THIS IS
  The publish form. Submits to POST /api/publish and emits `published` with the
  stored record (including the real slug) on success.

  WHY THE PREVIEW EXISTS
  This publishes to the open internet, where anyone can read it without an account.
  Nobody should find out what they published by looking at it afterwards. The
  preview shows exactly what a stranger sees, and it updates as the owner types.

  WHY "HIDE ACTUAL FIGURES" IS ON BY DEFAULT
  A shop owner sharing "Fridays are 34% busier" is telling a story. The same owner
  publishing "£59,555.50 last month" is telling their landlord and their
  competitors what they earn. The safe option is the default, and turning it off is
  a deliberate act.

  WHAT NOT TO CHANGE
  - The checkbox default. It protects the owner from themselves.
  - The preview stays visible while they type, not behind a "preview" button.
  - The class names. They come from docs/DESIGN-SYSTEM.md.
-->

<script setup lang="ts">
import type { BusinessType, PublishedInsight } from '#shared/schemas'

const props = defineProps<{
  /** The finding being published, for the preview. */
  title: string
  /** What the number measures, e.g. "revenue by day of week". */
  metricLabel: string
  /** The percentage change behind the finding. */
  metricValue: number
  /** Required by publishedInsightCreateSchema — the dataset's own business type. */
  businessType: BusinessType
}>()

const emit = defineEmits<{ published: [PublishedInsight] }>()

const open = defineModel<boolean>('open', { default: false })

// The three fields the owner fills in, taken from the published record rather than
// retyped, so the form cannot drift from what actually gets stored.
const form = reactive<Pick<PublishedInsight, 'displayName' | 'caption' | 'hideAbsoluteNumbers'>>({
  displayName: '',
  caption: '',
  hideAbsoluteNumbers: true
})

// Prefill the caption from the finding so the owner edits rather than starts blank.
watch(open, (isOpen) => {
  if (isOpen && !form.caption) form.caption = props.title
})

const captionLimit = 280

// Only used for the preview badge — the stored record keeps the raw value.
const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  restaurant: 'Restaurant',
  retail: 'Retail',
  gym: 'Gym'
}

const publishing = ref(false)
const publishError = ref<string | null>(null)

async function onPublish() {
  publishError.value = null
  publishing.value = true

  try {
    const created = await $fetch<PublishedInsight>('/api/publish', {
      method: 'POST',
      body: {
        displayName: form.displayName,
        caption: form.caption,
        metricLabel: props.metricLabel,
        metricValue: props.metricValue,
        hideAbsoluteNumbers: form.hideAbsoluteNumbers,
        businessType: props.businessType
      }
    })

    open.value = false
    emit('published', created)
  } catch (error) {
    publishError.value = (error as { statusMessage?: string }).statusMessage
      ?? 'We could not publish this. Please try again.'
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Publish this insight">
    <template #body>
      <div class="space-y-6">
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-globe"
          title="Anyone will be able to read this"
          description="Published insights appear on a public page that needs no account. You can unpublish later, but assume it has already been seen."
        />

        <UAlert
          v-if="publishError"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :description="publishError"
        />

        <div class="space-y-4">
          <UFormField label="Shown as" name="displayName" hint="Required">
            <UInput
              v-model="form.displayName"
              placeholder="Bella Pizza"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Caption" name="caption">
            <UTextarea
              v-model="form.caption"
              :rows="3"
              :maxlength="captionLimit"
              placeholder="Tuesdays are our quietest night, so that is when we try new dishes."
              class="w-full"
            />
            <template #hint>
              <span class="text-xs text-muted">
                {{ form.caption.length }} / {{ captionLimit }}
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

        <!-- The preview. Same tokens as the public feed, so it is not a guess. -->
        <div class="rounded-md border border-default p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="font-semibold">
              {{ form.displayName || 'Your business name' }}
            </p>
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ BUSINESS_TYPE_LABEL[businessType] }}
            </UBadge>
          </div>

          <p class="mt-3 text-base">
            {{ form.caption || 'Your caption appears here.' }}
          </p>

          <div class="mt-4 flex flex-wrap items-baseline gap-2">
            <UiChangeIndicator :value="metricValue" />
            <span class="text-sm text-muted">{{ metricLabel }}</span>
          </div>

          <p v-if="form.hideAbsoluteNumbers" class="mt-3 text-xs text-muted">
            Your actual takings are hidden. Only the change is published.
          </p>
          <p v-else class="mt-3 text-xs text-warning">
            Your actual takings will be published alongside this.
          </p>

          <p class="mt-3 text-xs text-muted">
            insightflow.app/insights/your-insight
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <UButton color="neutral" variant="subtle" :disabled="publishing" @click="open = false">
          Cancel
        </UButton>
        <UButton
          icon="i-lucide-globe"
          :loading="publishing"
          :disabled="publishing || !form.displayName || form.caption.length < 10"
          @click="onPublish"
        >
          Publish
        </UButton>
      </div>
    </template>
  </UModal>
</template>
