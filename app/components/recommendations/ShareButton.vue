<script setup lang="ts">
const open = ref(false)

const displayName = ref('')
const caption = ref('')
const hideAbsoluteNumbers = ref(true)

const emit = defineEmits<{
  publish: [{
    displayName: string
    caption: string
    hideAbsoluteNumbers: boolean
  }]
}>()

function publish() {
  emit('publish', {
    displayName: displayName.value,
    caption: caption.value,
    hideAbsoluteNumbers: hideAbsoluteNumbers.value
  })

  open.value = false
}
</script>

<template>
  <UModal v-model:open="open">
    <UButton>
      Share
    </UButton>

    <template #content>
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">
            Publish Insight
          </h2>
        </template>

        <div class="space-y-4">

          <UFormGroup label="Display Name">
            <UInput v-model="displayName" />
          </UFormGroup>

          <UFormGroup label="Caption">
            <UTextarea
              v-model="caption"
              :rows="3"
            />
          </UFormGroup>

          <UCheckbox
            v-model="hideAbsoluteNumbers"
            label="Hide absolute numbers"
          />

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="subtle"
              @click="open = false"
            >
              Cancel
            </UButton>

            <UButton @click="publish">
              Publish
            </UButton>
          </div>

        </div>
      </UCard>
    </template>
  </UModal>
</template>