<!--
  Admin dashboard. The only workspace an `admin` account can reach. See
  app/middleware/auth.ts, which sends a signed-in admin here and keeps them out
  of the business-owner workspace under /dashboard, /datasets and /recommendations.

  WHAT THIS IS
  A queue of business-owner accounts waiting on a decision, plus a full list of
  every business-owner account with a status. An admin can approve, reject,
  deactivate or reactivate from here; server/api/admin/users/[id]/action.post.ts
  is the only place those transitions are actually allowed to happen.
-->

<script setup lang="ts">
import { formatCount } from '#shared/format'
import { BUSINESS_SIZE_OPTIONS } from '#shared/schemas'
import type { AdminUserCounts, AdminUserSummary } from '#shared/types/admin'

definePageMeta({ middleware: 'auth', layout: 'admin' })
useSeoMeta({ title: 'Admin dashboard - InsightFlow' })

const toast = useToast()

const { data, status, error, refresh } = await useFetch<{
  items: AdminUserSummary[]
  counts: AdminUserCounts
}>('/api/admin/users')

const loading = computed(() => status.value === 'pending')

const pending = computed(() => data.value?.items.filter(item => item.status === 'pending') ?? [])
const others = computed(() => data.value?.items.filter(item => item.status !== 'pending') ?? [])

const businessSizeLabel = (size?: string) =>
  BUSINESS_SIZE_OPTIONS.find(option => option.value === size)?.label ?? '-'

const STATUS_BADGE: Record<string, { color: 'success' | 'error' | 'warning' | 'neutral', label: string }> = {
  pending: { color: 'warning', label: 'Pending review' },
  approved: { color: 'success', label: 'Approved' },
  deactivated: { color: 'error', label: 'Deactivated' },
  rejected: { color: 'neutral', label: 'Rejected' }
}

const actingOnId = ref<string | null>(null)

const ACTION_COPY: Record<string, { success: string, failure: string }> = {
  approve: { success: 'Account approved. They can now sign in.', failure: 'We could not approve this account.' },
  reject: { success: 'Account rejected.', failure: 'We could not reject this account.' },
  deactivate: { success: 'Account deactivated. They can no longer sign in.', failure: 'We could not deactivate this account.' },
  reactivate: { success: 'Account reactivated. They can sign in again.', failure: 'We could not reactivate this account.' }
}

async function act(id: string, action: 'approve' | 'reject' | 'deactivate' | 'reactivate') {
  actingOnId.value = id
  try {
    await $fetch(`/api/admin/users/${id}/action`, { method: 'POST', body: { action } })
    toast.add({ title: ACTION_COPY[action]!.success, color: 'success', icon: 'i-lucide-check' })
    await refresh()
  } catch (err) {
    toast.add({
      title: (err as { statusMessage?: string }).statusMessage ?? ACTION_COPY[action]!.failure,
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  } finally {
    actingOnId.value = null
  }
}

const otherColumns = [
  { accessorKey: 'business', header: 'Business' },
  { accessorKey: 'businessSize', header: 'Size' },
  { accessorKey: 'location', header: 'Location' },
  { accessorKey: 'estimatedCustomersPerMonth', header: 'Est. customers / mo' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: '' }
]
</script>

<template>
  <div>
    <UiPageHeader
      title="Business owners"
      description="Approve new sign-ups and manage who can access InsightFlow."
    />

    <UAlert
      v-if="error"
      class="mb-8"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="We could not load accounts"
      description="Refresh the page to try again."
    />

    <div v-else-if="loading" class="space-y-8">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <USkeleton v-for="card in 4" :key="card" class="h-28 w-full" />
      </div>
      <USkeleton class="h-64 w-full" />
    </div>

    <div v-else-if="data" class="space-y-8">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiMetricCard label="Pending review" :value="formatCount(data.counts.pending)" />
        <UiMetricCard label="Approved" :value="formatCount(data.counts.approved)" />
        <UiMetricCard label="Deactivated" :value="formatCount(data.counts.deactivated)" />
        <UiMetricCard label="Rejected" :value="formatCount(data.counts.rejected)" />
      </div>

      <div>
        <h2 class="text-base font-semibold">
          Waiting for a decision
        </h2>

        <UiEmptyState
          v-if="pending.length === 0"
          class="mt-4"
          icon="i-lucide-inbox"
          title="Nothing waiting"
          description="New sign-ups will show up here for approval before they can sign in."
        />

        <div v-else class="mt-4 grid gap-4 lg:grid-cols-2">
          <UCard v-for="owner in pending" :key="owner.id">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="font-semibold truncate">
                  {{ owner.displayName }}
                </p>
                <p class="text-xs text-muted truncate">
                  {{ owner.email }} · @{{ owner.username }}
                </p>
              </div>
              <UBadge :color="STATUS_BADGE[owner.status]!.color" variant="subtle">
                {{ STATUS_BADGE[owner.status]!.label }}
              </UBadge>
            </div>

            <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt class="text-xs text-muted">
                  Business size
                </dt>
                <dd>{{ businessSizeLabel(owner.businessSize) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">
                  Phone
                </dt>
                <dd>{{ owner.phone }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">
                  Location
                </dt>
                <dd>{{ owner.location }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">
                  Est. customers / month
                </dt>
                <dd>{{ formatCount(owner.estimatedCustomersPerMonth ?? 0) }}</dd>
              </div>
            </dl>

            <div class="mt-4 flex gap-2">
              <UButton
                icon="i-lucide-check"
                :loading="actingOnId === owner.id"
                @click="act(owner.id, 'approve')"
              >
                Approve
              </UButton>
              <UButton
                color="error"
                variant="subtle"
                icon="i-lucide-x"
                :loading="actingOnId === owner.id"
                @click="act(owner.id, 'reject')"
              >
                Reject
              </UButton>
            </div>
          </UCard>
        </div>
      </div>

      <div>
        <h2 class="text-base font-semibold">
          All business owners
        </h2>

        <UiEmptyState
          v-if="others.length === 0"
          class="mt-4"
          icon="i-lucide-users"
          title="No accounts yet"
          description="Approved, deactivated and rejected accounts will appear here."
        />

        <UTable v-else class="mt-4" :data="others" :columns="otherColumns">
          <template #business-cell="{ row }">
            <div class="min-w-0">
              <p class="font-medium truncate">
                {{ row.original.displayName }}
              </p>
              <p class="text-xs text-muted truncate">
                {{ row.original.email }}
              </p>
            </div>
          </template>

          <template #businessSize-cell="{ row }">
            {{ businessSizeLabel(row.original.businessSize) }}
          </template>

          <template #location-cell="{ row }">
            {{ row.original.location }}
          </template>

          <template #estimatedCustomersPerMonth-cell="{ row }">
            {{ formatCount(row.original.estimatedCustomersPerMonth ?? 0) }}
          </template>

          <template #status-cell="{ row }">
            <UBadge :color="STATUS_BADGE[row.original.status]!.color" variant="subtle">
              {{ STATUS_BADGE[row.original.status]!.label }}
            </UBadge>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-2">
              <UButton
                v-if="row.original.status === 'approved'"
                size="xs"
                color="error"
                variant="subtle"
                :loading="actingOnId === row.original.id"
                @click="act(row.original.id, 'deactivate')"
              >
                Deactivate
              </UButton>
              <UButton
                v-if="row.original.status === 'deactivated'"
                size="xs"
                color="neutral"
                variant="subtle"
                :loading="actingOnId === row.original.id"
                @click="act(row.original.id, 'reactivate')"
              >
                Reactivate
              </UButton>
              <UButton
                v-if="row.original.status === 'rejected'"
                size="xs"
                color="neutral"
                variant="subtle"
                :loading="actingOnId === row.original.id"
                @click="act(row.original.id, 'approve')"
              >
                Approve
              </UButton>
            </div>
          </template>
        </UTable>
      </div>
    </div>
  </div>
</template>
