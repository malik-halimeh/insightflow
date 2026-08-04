<!--
  OWNER: M2 (data sets)

  The file picker for a sales export. It checks the file looks like a CSV before
  handing it up; everything else is the upload endpoint's job.

  The wrong-file message is shown in the form, not in a browser alert. An alert
  stops the page, cannot be styled, and disappears the moment it is dismissed —
  so an owner who clicks it away has no idea what went wrong.
-->

<script setup lang="ts">
const emit = defineEmits<{ upload: [file: File] }>()

const error = ref<string | null>(null)
const fileName = ref<string | null>(null)

function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  error.value = null
  fileName.value = null

  if (!file) return

  if (!file.name.toLowerCase().endsWith('.csv')) {
    error.value = 'That file is not a CSV. Export your sales from the till as CSV and try again.'
    input.value = ''
    return
  }

  fileName.value = file.name
  emit('upload', file)
}
</script>

<template>
  <UFormField
    label="Sales data"
    name="file"
    hint="CSV"
    :error="error ?? undefined"
  >
    <UInput type="file" accept=".csv,text/csv" class="w-full" @change="handleUpload" />

    <template v-if="fileName" #help>
      {{ fileName }} is ready to check.
    </template>
  </UFormField>
</template>
