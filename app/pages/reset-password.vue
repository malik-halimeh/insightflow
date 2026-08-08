<!--
  OWNER: M1

  Second half of the reset flow, reached only via the link emailed by
  forgot-password.vue. The token lives in the query string and travels to the
  server exactly once, on submit; see server/api/auth/reset-password.post.ts
  for what makes a token valid.
-->

<script setup lang="ts">
import { resetPasswordSchema, type ResetPasswordInput } from '#shared/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: false })
useSeoMeta({ title: 'Set a new password - InsightFlow' })

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''

const state = reactive<ResetPasswordInput>({ token, password: '', confirmPassword: '' })

const serverError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const pending = ref(false)

async function onSubmit(event: FormSubmitEvent<ResetPasswordInput>) {
  serverError.value = null
  successMessage.value = null
  pending.value = true

  try {
    const { message } = await $fetch('/api/auth/reset-password', { method: 'POST', body: event.data })
    successMessage.value = message
  } catch (error) {
    serverError.value = (error as { statusMessage?: string }).statusMessage
      ?? 'We could not reset your password. Please request a new link and try again.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6">
    <div class="w-full max-w-sm">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
        <span class="flex size-7 items-center justify-center rounded-md bg-primary on-accent">
          <UIcon name="i-lucide-chart-column" class="size-4" />
        </span>
        InsightFlow
      </NuxtLink>

      <div class="mt-6">
        <h1 class="text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <p class="mt-1 text-sm text-muted">
          Choose a new password for your account.
        </p>
      </div>

      <UAlert
        v-if="!token"
        class="mt-6"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="This link is missing its token"
        description="Please use the link from the email exactly as it was sent, or request a new one."
      />

      <UAlert
        v-if="successMessage"
        class="mt-6"
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        :description="successMessage"
      />

      <UAlert
        v-if="serverError"
        class="mt-6"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :description="serverError"
      />

      <UForm
        v-if="token && !successMessage"
        :schema="resetPasswordSchema"
        :state="state"
        class="mt-6 space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="New password" name="password">
          <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
        </UFormField>

        <UFormField label="Confirm new password" name="confirmPassword">
          <UInput v-model="state.confirmPassword" type="password" autocomplete="new-password" class="w-full" />
        </UFormField>

        <UButton type="submit" :loading="pending" block>
          Reset password
        </UButton>
      </UForm>

      <p v-if="successMessage" class="mt-6 text-sm text-muted">
        <NuxtLink to="/login" class="ink-accent hover:underline">
          Continue to sign in
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
