<!--
  OWNER: M1

  Entry point for password reset — takes an email, always shows the same
  generic confirmation regardless of whether an account exists (the server
  behaves the same way; see server/api/auth/forgot-password.post.ts).

  No auth middleware here on purpose, same reasoning as /login: gating this
  page would send a signed-out person into a redirect loop.
-->

<script setup lang="ts">
import { forgotPasswordSchema, type ForgotPasswordInput } from '#shared/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: false })
useSeoMeta({ title: 'Reset your password — InsightFlow' })

const state = reactive<ForgotPasswordInput>({ email: '' })

const serverError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const pending = ref(false)

async function onSubmit(event: FormSubmitEvent<ForgotPasswordInput>) {
  serverError.value = null
  successMessage.value = null
  pending.value = true

  try {
    const { message } = await $fetch('/api/auth/forgot-password', { method: 'POST', body: event.data })
    successMessage.value = message
  } catch (error) {
    serverError.value = (error as { statusMessage?: string }).statusMessage
      ?? 'We could not process that request. Please try again.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6">
    <div class="w-full max-w-sm">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
        <span class="flex size-7 items-center justify-center rounded-md bg-primary text-inverted">
          <UIcon name="i-lucide-chart-column" class="size-4" />
        </span>
        InsightFlow
      </NuxtLink>

      <div class="mt-6">
        <h1 class="text-2xl font-semibold tracking-tight">
          Forgot your password?
        </h1>
        <p class="mt-1 text-sm text-muted">
          Enter the email on your account and we'll send you a link to reset it.
        </p>
      </div>

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
        v-if="!successMessage"
        :schema="forgotPasswordSchema"
        :state="state"
        class="mt-6 space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            placeholder="you@yourbusiness.com"
            class="w-full"
          />
        </UFormField>

        <UButton type="submit" :loading="pending" block>
          Send reset link
        </UButton>
      </UForm>

      <p class="mt-6 text-sm text-muted">
        <NuxtLink to="/login" class="text-primary hover:underline">
          Back to sign in
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
