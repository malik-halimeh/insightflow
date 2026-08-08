<script setup lang="ts">
import type { DatasetVersion } from '#shared/schemas'

definePageMeta({ middleware: 'auth', layout: 'app' })
useSeoMeta({ title: 'Data set upload history | InsightFlow' })

const route = useRoute()
const datasetId = computed(() => route.params.id as string)

const { data: versions, pending, error, refresh } = await useFetch<DatasetVersion[]>(
  () => `/api/datasets/${route.params.id}/versions`,
  { key: `dataset-versions-${route.params.id}` }
)

const selectedVersion = ref<DatasetVersion | null>(null)
const restoring = ref(false)
const restoreError = ref<string | null>(null)

function openRestoreModal(version: DatasetVersion) {
  restoreError.value = null
  selectedVersion.value = version
}

function closeRestoreModal() {
  selectedVersion.value = null
  restoreError.value = null
}

async function confirmRestore() {
  if (!selectedVersion.value) return

  restoring.value = true
  restoreError.value = null

  try {
    await $fetch(`/api/datasets/${datasetId.value}/versions/${selectedVersion.value.id}/restore`, {
      method: 'POST',
      body: { versionId: selectedVersion.value.id }
    })
    closeRestoreModal()
    await refresh()
  } catch (error) {
    const failure = error as { data?: { statusMessage?: string }, message?: string }
    restoreError.value = failure.data?.statusMessage ?? failure.message ?? 'Failed to restore data set version.'
  } finally {
    restoring.value = false
  }
}

function formatDate(isoString: string): string {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div>
    <NuxtLink :to="`/datasets/${datasetId}`" class="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300">
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      Back to data set
    </NuxtLink>

    <UiPageHeader title="Data set upload history" description="Review previous uploads, inspect data quality, and restore an older version." />

    <div v-if="pending" class="space-y-4">
      <USkeleton class="h-16 w-full" />
      <USkeleton class="h-72 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Upload history could not be loaded"
      :description="error.statusMessage || error.message"
    />

    <UiEmptyState
      v-else-if="!versions || versions.length === 0"
      icon="i-lucide-history"
      title="No upload history found"
      description="This data set does not have any recorded versions yet."
    />

    <UCard v-else class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-4xl text-left text-sm">
          <thead class="border-b border-default bg-elevated/60 text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th class="px-4 py-3">Version</th>
              <th class="px-4 py-3">Upload date</th>
              <th class="px-4 py-3">Period</th>
              <th class="px-4 py-3">Rows</th>
              <th class="px-4 py-3">Rejected</th>
              <th class="px-4 py-3">Data quality</th>
              <th class="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="version in versions" :key="version.id" class="transition hover:bg-elevated/40">
              <td class="px-4 py-4 font-semibold">Version {{ version.versionNumber }}</td>
              <td class="px-4 py-4 text-muted">{{ formatDate(version.createdAt) }}</td>
              <td class="px-4 py-4 text-muted">{{ version.periodStart }} to {{ version.periodEnd }}</td>
              <td class="px-4 py-4">{{ version.rowCount }}</td>
              <td class="px-4 py-4">
                <span :class="version.rejectedCount > 0 ? 'text-error font-semibold' : 'text-muted'">{{ version.rejectedCount }}</span>
              </td>
              <td class="px-4 py-4">
                <div class="flex flex-wrap gap-2">
                  <UBadge v-if="version.quality.thin" color="warning" variant="subtle" title="Too little history for a reliable weekly pattern">Thin data</UBadge>
                  <UBadge v-if="version.quality.missingDays > 0" color="warning" variant="subtle">{{ version.quality.missingDays }} missing day(s)</UBadge>
                  <UBadge v-if="version.quality.duplicateRows > 0" color="info" variant="subtle">{{ version.quality.duplicateRows }} duplicate(s)</UBadge>
                  <UBadge v-if="!version.quality.thin && version.quality.missingDays === 0 && version.quality.duplicateRows === 0" color="success" variant="subtle">Good</UBadge>
                </div>
              </td>
              <td class="px-4 py-4 text-right">
                <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-rotate-ccw" @click="openRestoreModal(version)">Restore</UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UModal :open="Boolean(selectedVersion)" title="Restore data set version" @update:open="value => !value && closeRestoreModal()">
      <template #body>
        <div v-if="selectedVersion" class="space-y-4">
          <p class="text-sm leading-6 text-muted">
            Restoring version {{ selectedVersion.versionNumber }} changes what the dashboard, recommendations, and forecasts read across the application. Analytics will use records from this older upload.
          </p>
          <UAlert v-if="restoreError" color="error" variant="subtle" :description="restoreError" />
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" :disabled="restoring" @click="closeRestoreModal">Cancel</UButton>
          <UButton class="text-primary-950" :loading="restoring" icon="i-lucide-rotate-ccw" @click="confirmRestore">Confirm restore</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
