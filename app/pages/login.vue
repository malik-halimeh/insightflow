<script setup lang="ts">
import { loginSchema, type LoginInput } from '#shared/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'

// No auth middleware here on purpose: gating the login page would send anyone who
// is signed out into a redirect loop.
definePageMeta({ layout: false })

const route = useRoute()
const state = reactive<LoginInput>({ username: '', password: '' })
const serverError = ref<string | null>(null)
const pending = ref(false)

async function onSubmit(event: FormSubmitEvent<LoginInput>) {
  serverError.value = null
  pending.value = true

  try {
    await $fetch('/api/auth/login', { method: 'POST', body: event.data })

    // A full page load rather than a client-side transition, so the browser sends
    // the new httpOnly cookie and the destination renders as a signed-in request.
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await navigateTo(redirect, { external: true })
  } catch (error) {
    serverError.value = (error as { statusMessage?: string }).statusMessage
      ?? 'We could not sign you in. Please try again.'
    pending.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-semibold">
          Sign in to InsightFlow
        </h1>
      </template>

      <UForm
        :schema="loginSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UAlert
          v-if="serverError"
          color="error"
          variant="subtle"
          :description="serverError"
        />

        <UFormField label="Username" name="username">
          <UInput v-model="state.username" autocomplete="username" class="w-full" />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>

        <UButton type="submit" :loading="pending" block>
          Sign in
        </UButton>
      </UForm>
    </UCard>
  </div>
</template>
