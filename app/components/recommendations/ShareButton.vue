<!--
  OWNER: M4 (recommendations and publishing)

  The publish button and its dialog. This replaces the earlier ShareDialog, which
  asked for the same three fields — two components doing one job would have
  drifted apart within a week.

  WHY THE PREVIEW IS HERE
  This publishes to the open internet, where anyone can read it without an
  account. Nobody should discover what they published by looking at it afterwards,
  so the preview shows exactly what a stranger sees and updates as they type.

  WHY "HIDE MY ACTUAL FIGURES" IS ON BY DEFAULT
  An owner sharing "Fridays are 34% busier" is telling a story. The same owner
  publishing their takings is telling their landlord and their competitors what
  they earn. The safe option is the default; turning it off is a deliberate act.

  STILL TO DO
  There is no publish endpoint yet. This emits the form upwards and the page must
  send it once server/api/publish exists. Ask M1 for publishedInsightCreateSchema
  and bind the form to it rather than checking the fields by hand.
-->

<script setup lang="ts">
const props = defineProps<{
  /** The finding being published. Prefills the caption and drives the preview. */
  title: string
  /** What the number measures, e.g. "revenue by day of week". */
  metricLabel: string
  /** The percentage change behind the finding. */
  metricValue: number
}>()

const emit = defineEmits<{
  publish: [{ displayName: string, caption: string, hideAbsoluteNumbers: boolean }]
}>()

const open = ref(false)

const form = reactive({
  displayName: '',
  caption: '',
  hideAbsoluteNumbers: true
})

const CAPTION_LIMIT = 280
const CAPTION_MINIMUM = 10

// Start from the finding so the owner edits rather than facing a blank box.
watch(open, (isOpen) => {
  if (isOpen && !form.caption) form.caption = props.title
})

const canPublish = computed(() =>
  form.displayName.trim().length >= 2 && form.caption.trim().length >= CAPTION_MINIMUM
)

function publish() {
  emit('publish', { ...form })
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" title="Publish this insight">
    <!-- Quiet on purpose: the recommendation is what the owner came for. -->
    <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-share-2">
      Share
    </UButton>

    <template #body>
      <div class="space-y-6">
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

        <div class="rounded-md border border-default p-4">
          <p class="font-semibold">
            {{ form.displayName || 'Your business name' }}
          </p>

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
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-wrap justify-end gap-2">
        <UButton color="neutral" variant="subtle" @click="open = false">
          Cancel
        </UButton>
        <UButton icon="i-lucide-globe" :disabled="!canPublish" @click="publish">
          Publish
        </UButton>
      </div>
    </template>
  </UModal>
</template>
