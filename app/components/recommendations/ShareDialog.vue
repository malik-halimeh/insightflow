<!--
  OWNER: M4 (recommendations and publishing)

  WHAT THIS IS
  The publish form. Nothing here talks to a server.

  WHY THE PREVIEW EXISTS
  This publishes to the open internet, where anyone can read it without an account.
  Nobody should find out what they published by looking at it afterwards. The
  preview shows exactly what a stranger sees, and it updates as the owner types.

  WHY "HIDE ACTUAL FIGURES" IS ON BY DEFAULT
  A shop owner sharing "Fridays are 34% busier" is telling a story. The same owner
  publishing "£59,555.50 last month" is telling their landlord and their
  competitors what they earn. The safe option is the default, and turning it off is
  a deliberate act.

  WHAT TO REPLACE
  1. `onPublish` — call the publish endpoint with `$fetch`, then show the public
     link.
  2. The `slug` line in the preview — the real slug comes back from the server.

  BEFORE YOU WIRE IT
  There is no create schema for publishing yet. Ask M1 for
  `publishedInsightCreateSchema` and bind the form to it. Do not bind to
  `publishedInsightSchema` — that is the stored record, it includes the id and the
  slug, and a form bound to it cannot submit.

  WHAT NOT TO CHANGE
  - The checkbox default. It protects the owner from themselves.
  - The preview stays visible while they type, not behind a "preview" button.
  - The class names. They come from docs/DESIGN-SYSTEM.md.
-->

<script setup lang="ts">
import { formatPercentChange } from '#shared/format'

const props = defineProps<{
  /** The finding being published, for the preview. */
  title: string
  /** What the number measures, e.g. "revenue by day of week". */
  metricLabel: string
  /** The percentage change behind the finding. */
  metricValue: number
}>()

const open = defineModel<boolean>('open', { default: false })

const form = reactive({
  displayName: '',
  caption: '',
  hideAbsoluteNumbers: true
})

// Prefill the caption from the finding so the owner edits rather than starts blank.
watch(open, (isOpen) => {
  if (isOpen && !form.caption) form.caption = props.title
})

const captionLimit = 280

function onPublish() {
  // M4: publish, then show the public link.
  open.value = false
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
              Restaurant
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
        <UButton color="neutral" variant="subtle" @click="open = false">
          Cancel
        </UButton>
        <UButton icon="i-lucide-globe" :disabled="!form.displayName || form.caption.length < 10" @click="onPublish">
          Publish
        </UButton>
      </div>
    </template>
  </UModal>
</template>
