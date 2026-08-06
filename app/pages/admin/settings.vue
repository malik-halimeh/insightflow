<!--
  Admin account settings — the only place an admin can change their own name,
  username, email or password without editing ADMIN_USERNAME/ADMIN_PASSWORD in
  .env and restarting the server. See server/api/admin/profile.patch.ts.
-->

<script setup lang="ts">
import { adminProfileUpdateSchema, type AdminProfileUpdateInput } from '#shared/schemas'
import type { AdminProfile } from '#shared/types/admin'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ middleware: 'auth', layout: 'admin' })
useSeoMeta({ title: 'Account settings — InsightFlow' })

const toast = useToast()

const { data: profile, status } = await useFetch<AdminProfile>('/api/admin/profile')

const state = reactive<AdminProfileUpdateInput>({
  displayName: '',
  username: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: ''
})

watch(profile, (value) => {
  if (!value) return
  state.displayName = value.displayName
  state.username = value.username
  state.email = value.email
}, { immediate: true })

const loading = computed(() => status.value === 'pending')
const saving = ref(false)
const serverError = ref<string | null>(null)

async function onSubmit(event: FormSubmitEvent<AdminProfileUpdateInput>) {
  serverError.value = null
  saving.value = true

  try {
    const updated = await $fetch('/api/admin/profile', { method: 'PATCH', body: event.data })
    profile.value = updated
    state.currentPassword = ''
    state.newPassword = ''
    state.confirmNewPassword = ''
    toast.add({ title: 'Your account has been updated.', color: 'success', icon: 'i-lucide-check' })
  } catch (error) {
    serverError.value = (error as { statusMessage?: string }).statusMessage
      ?? 'We could not save your changes. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Account settings"
      description="Update your name, sign-in details and password."
    />

    <UAlert
      v-if="profile && !profile.persisted"
      class="mb-6 max-w-lg"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="This account only exists in your .env file"
      description="You are currently signed in through ADMIN_USERNAME/ADMIN_PASSWORD. Saving changes here creates a real account in the database, so sign-in stops depending on those two variables."
    />

    <USkeleton v-if="loading" class="h-96 w-full max-w-lg" />

    <UForm
      v-else
      :schema="adminProfileUpdateSchema"
      :state="state"
      class="max-w-lg space-y-4"
      @submit="onSubmit"
    >
      <UAlert
        v-if="serverError"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :description="serverError"
      />

      <UFormField label="Your name" name="displayName">
        <UInput v-model="state.displayName" autocomplete="name" class="w-full" />
      </UFormField>

      <UFormField label="Username" name="username">
        <UInput v-model="state.username" autocomplete="username" class="w-full" />
      </UFormField>

      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>

      <UFormField
        label="New password"
        name="newPassword"
        description="Leave blank to keep your current password."
      >
        <UInput v-model="state.newPassword" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>

      <UFormField label="Confirm new password" name="confirmNewPassword">
        <UInput v-model="state.confirmNewPassword" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>

      <UFormField
        label="Current password"
        name="currentPassword"
        description="Required to confirm any change on this form."
      >
        <UInput v-model="state.currentPassword" type="password" autocomplete="current-password" class="w-full" />
      </UFormField>

      <UButton type="submit" :loading="saving">
        Save changes
      </UButton>
    </UForm>
  </div>
</template>
