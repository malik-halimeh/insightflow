<template>
  <div class="max-w-6xl mx-auto p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink :to="`/datasets/${datasetId}`" class="text-sm text-blue-600 hover:underline">
          &larr; Back to Dataset
        </NuxtLink>
        <h1 class="text-2xl font-bold text-gray-900 mt-1">Dataset Upload History</h1>
        <p class="text-sm text-gray-500">
          Review previous uploads, inspect data quality indicators, and restore older versions.
        </p>
      </div>
    </div>

    <!-- 1. LOADING STATE -->
    <div v-if="pending" class="p-12 text-center text-gray-500 bg-white rounded-lg border">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-2"></div>
      <p>Loading version history...</p>
    </div>

    <!-- ERROR STATE -->
    <div v-else-if="error" class="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
      <p class="font-semibold">Failed to load upload history.</p>
      <p class="text-sm">{{ error.statusMessage || error.message }}</p>
    </div>

    <!-- 2. EMPTY STATE -->
    <div v-else-if="!versions || versions.length === 0" class="p-12 text-center bg-white rounded-lg border">
      <h3 class="text-lg font-medium text-gray-900">No upload history found</h3>
      <p class="text-sm text-gray-500 mt-1">This dataset does not have any recorded versions yet.</p>
    </div>

    <!-- 3. READY STATE (History Table) -->
    <div v-else class="bg-white border rounded-lg overflow-hidden shadow-sm">
      <table class="w-full text-left border-collapse">
        <thead class="bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-b">
          <tr>
            <th class="p-4">Version</th>
            <th class="p-4">Upload Date</th>
            <th class="p-4">Period</th>
            <th class="p-4">Rows</th>
            <th class="p-4">Rejected</th>
            <th class="p-4">Data Quality</th>
            <th class="p-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y text-sm text-gray-700">
          <tr v-for="version in versions" :key="version.id" class="hover:bg-gray-50">
            <!-- Version Number -->
            <td class="p-4 font-semibold text-gray-900">
              Version {{ version.versionNumber }}
            </td>

            <!-- Date -->
            <td class="p-4 text-gray-500">
              {{ formatDate(version.createdAt) }}
            </td>

            <!-- Period Range -->
            <td class="p-4 text-gray-600">
              {{ version.periodStart }} &rarr; {{ version.periodEnd }}
            </td>

            <!-- Row Count -->
            <td class="p-4 font-mono">
              {{ version.rowCount }}
            </td>

            <!-- Rejected Count -->
            <td class="p-4 font-mono">
              <span :class="version.rejectedCount > 0 ? 'text-red-600 font-semibold' : 'text-gray-500'">
                {{ version.rejectedCount }}
              </span>
            </td>

            <!-- Quality Badges -->
            <td class="p-4">
              <div class="flex flex-wrap gap-1">
                <span
                  v-if="version.quality.thin"
                  class="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded"
                  title="Too little history to read a reliable weekly pattern"
                >
                  Thin Data
                </span>
                <span
                  v-if="version.quality.missingDays > 0"
                  class="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded"
                >
                  {{ version.quality.missingDays }} Missing Day(s)
                </span>
                <span
                  v-if="version.quality.duplicateRows > 0"
                  class="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded"
                >
                  {{ version.quality.duplicateRows }} Duplicate(s)
                </span>
                <span
                  v-if="!version.quality.thin && version.quality.missingDays === 0 && version.quality.duplicateRows === 0"
                  class="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded"
                >
                  Good
                </span>
              </div>
            </td>

            <!-- Restore Action -->
            <td class="p-4 text-right">
              <button
                @click="openRestoreModal(version)"
                class="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200"
              >
                Restore
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- CONFIRMATION MODAL -->
    <div
      v-if="selectedVersion"
      class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl space-y-4">
        <h3 class="text-lg font-bold text-gray-900">
          Restore Version {{ selectedVersion.versionNumber }}?
        </h3>

        <!-- Consequence Warning -->
        <p class="text-sm text-gray-600 leading-relaxed">
          Restoring version {{ selectedVersion.versionNumber }} changes what the 
          <strong>dashboard</strong>, <strong>recommendations</strong>, and <strong>forecasts</strong> read across the entire application. All analytics will start processing records from this older upload.
        </p>

        <div v-if="restoreError" class="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-200">
          {{ restoreError }}
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            @click="closeRestoreModal"
            :disabled="restoring"
            class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            @click="confirmRestore"
            :disabled="restoring"
            class="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50"
          >
            {{ restoring ? 'Restoring...' : 'Confirm Restore' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DatasetVersion } from '#shared/schemas'

const route = useRoute()
const datasetId = computed(() => route.params.id as string)

// 1. Reactive useFetch using getter function for dynamic routing
const { data: versions, pending, error, refresh } = await useFetch<DatasetVersion[]>(
  () => `/api/datasets/${route.params.id}/versions`,
  { key: `dataset-versions-${route.params.id}` }
)

// Confirmation Modal State
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

// 2. Perform Restore sending body payload matching server restore endpoint schema
async function confirmRestore() {
  if (!selectedVersion.value) return

  restoring.value = true
  restoreError.value = null

  try {
    await $fetch(`/api/datasets/${datasetId.value}/versions/${selectedVersion.value.id}/restore`, {
      method: 'POST',
      body: {
        versionId: selectedVersion.value.id
      }
    })
    closeRestoreModal()
    await refresh()
  } catch (err: any) {
    restoreError.value = err?.data?.statusMessage || err?.message || 'Failed to restore dataset version.'
  } finally {
    restoring.value = false
  }
}

function formatDate(isoString: string): string {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>