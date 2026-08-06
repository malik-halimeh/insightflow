<!--
  OWNER: M1

  One sign-in form for every account — there is no "Business owner" / "Admin"
  choice on this page. The server identifies the account by username or email
  and returns its real role, and that role (not anything picked on this page)
  decides where the person lands after signing in.

  Sign in / Create account tabs still apply only to the sign-in side, since an
  admin account can only be created directly in the database (see
  docs/HANDOFF.md) — signing up here always creates a business owner account.

  No auth middleware here on purpose: gating this page would send anyone who is
  signed out into a redirect loop.
-->

<script setup lang="ts">
import {
  BUSINESS_SIZE_OPTIONS,
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput
} from '#shared/schemas'
import type { FormSubmitEvent, TabsItem } from '@nuxt/ui'

definePageMeta({ layout: false })
useSeoMeta({ title: 'Sign in — InsightFlow' })

const route = useRoute()

const authTabs: TabsItem[] = [
  { label: 'Sign in', value: 'signin' },
  { label: 'Create account', value: 'signup' }
]

const mode = ref<'signin' | 'signup'>(route.query.mode === 'signup' ? 'signup' : 'signin')

const loginState = reactive<LoginInput>({ identifier: '', password: '' })
const registerState = reactive<RegisterInput>({
  username: '',
  email: '',
  displayName: '',
  businessSize: 'small',
  phone: '',
  location: '',
  estimatedCustomersPerMonth: 100,
  password: '',
  confirmPassword: ''
})

const serverError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const pending = ref(false)

watch(mode, () => {
  serverError.value = null
  successMessage.value = null
})

async function afterAuth(roleRedirect: string) {
  // The redirect query param (if any) wins over the role default, so a link that
  // sent someone to sign in from a specific page can send them back to it.
  const target = typeof route.query.redirect === 'string' ? route.query.redirect : roleRedirect

  // A full page load rather than a client-side transition, so the browser sends
  // the new httpOnly cookie and the destination renders as a signed-in request.
  await navigateTo(target, { external: true })
}

async function onSignIn(event: FormSubmitEvent<LoginInput>) {
  serverError.value = null
  successMessage.value = null
  pending.value = true

  try {
    // The server identifies the account and decides the role — and therefore the
    // redirect — from what's on that account, never from anything sent here.
    const { redirect } = await $fetch('/api/auth/login', { method: 'POST', body: event.data })
    await afterAuth(redirect)
  } catch (error) {
    serverError.value = (error as { statusMessage?: string }).statusMessage
      ?? 'We could not sign you in. Please try again.'
    pending.value = false
  }
}

async function onSignUp(event: FormSubmitEvent<RegisterInput>) {
  serverError.value = null
  successMessage.value = null
  pending.value = true

  try {
    await $fetch('/api/auth/register', { method: 'POST', body: event.data })
    successMessage.value = 'Your account has been created. An admin will review it shortly — you can sign in as soon as it is approved.'
    mode.value = 'signin'
    loginState.identifier = registerState.username
  } catch (error) {
    serverError.value = (error as { statusMessage?: string }).statusMessage
      ?? 'We could not create your account. Please try again.'
  } finally {
    pending.value = false
  }
}

const features = [
  {
    icon: 'i-lucide-chart-column',
    text: 'See revenue, top sellers and weekday patterns the moment you upload a spreadsheet.'
  },
  {
    icon: 'i-lucide-lightbulb',
    text: 'Get plain-language recommendations you can act on the same day.'
  },
  {
    icon: 'i-lucide-globe',
    text: 'Publish a finding to a public page, with your real figures hidden by default.'
  }
]
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <!-- Brand panel. Hidden below lg — a phone gets straight to the form. -->
    <div class="relative hidden overflow-hidden lg:flex flex-col justify-between border-r border-default bg-elevated px-12 py-12">
      <div
        class="pointer-events-none absolute inset-x-0 -top-24 h-[420px] bg-[radial-gradient(ellipse_at_top,_var(--ui-primary)_0%,_transparent_60%)] opacity-[0.10]"
      />

      <NuxtLink to="/" class="relative flex items-center gap-2 font-semibold tracking-tight">
        <span class="flex size-7 items-center justify-center rounded-md bg-primary text-inverted">
          <UIcon name="i-lucide-chart-column" class="size-4" />
        </span>
        InsightFlow
      </NuxtLink>

      <div class="relative max-w-sm">
        <p class="text-2xl font-semibold tracking-tight">
          Know what is actually happening in your business.
        </p>
        <p class="mt-4 text-lg text-muted">
          Upload your sales and InsightFlow turns them into findings you can act on
          today.
        </p>

        <ul class="mt-8 space-y-4">
          <li v-for="feature in features" :key="feature.text" class="flex items-center gap-3">
            <UIcon :name="feature.icon" class="size-5 shrink-0 text-primary" />
            <span class="text-sm text-muted">{{ feature.text }}</span>
          </li>
        </ul>
      </div>

      <p class="relative text-xs text-muted">
        A business intelligence tool for small businesses.
      </p>
    </div>

    <div class="flex items-center justify-center px-4 py-12 sm:px-6">
      <div class="w-full max-w-sm">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold tracking-tight lg:hidden">
          <span class="flex size-7 items-center justify-center rounded-md bg-primary text-inverted">
            <UIcon name="i-lucide-chart-column" class="size-4" />
          </span>
          InsightFlow
        </NuxtLink>

        <div class="mt-6 lg:mt-0">
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ mode === 'signin' ? 'Welcome back' : 'Create your account' }}
          </h1>
          <p class="mt-1 text-sm text-muted">
            {{
              mode === 'signin'
                ? 'Sign in to see how your business is doing.'
                : 'Start turning your sales data into findings.'
            }}
          </p>
        </div>

        <UTabs v-model="mode" :items="authTabs" class="mt-6" />

        <UAlert
          v-if="successMessage"
          class="mt-4"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          :description="successMessage"
        />

        <UAlert
          v-if="serverError"
          class="mt-4"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :description="serverError"
        />

        <UForm
          v-if="mode === 'signin'"
          :schema="loginSchema"
          :state="loginState"
          class="mt-6 space-y-4"
          @submit="onSignIn"
        >
          <UFormField label="Username or email" name="identifier">
            <UInput
              v-model="loginState.identifier"
              autocomplete="username"
              placeholder="you@yourbusiness.com"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Password" name="password">
            <UInput
              v-model="loginState.password"
              type="password"
              autocomplete="current-password"
              class="w-full"
            />
            <template #hint>
              <NuxtLink to="/forgot-password" class="text-primary hover:underline">
                Forgot password?
              </NuxtLink>
            </template>
          </UFormField>

          <UButton type="submit" :loading="pending" block>
            Sign in
          </UButton>
        </UForm>

        <UForm
          v-else
          :schema="registerSchema"
          :state="registerState"
          class="mt-6 space-y-4"
          @submit="onSignUp"
        >
          <UFormField label="Your name" name="displayName">
            <UInput
              v-model="registerState.displayName"
              autocomplete="name"
              placeholder="Bella Rossi"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Username" name="username">
            <UInput
              v-model="registerState.username"
              autocomplete="username"
              placeholder="bellapizza"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="registerState.email"
              type="email"
              autocomplete="email"
              placeholder="you@yourbusiness.com"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Business size" name="businessSize">
            <USelect
              v-model="registerState.businessSize"
              :items="BUSINESS_SIZE_OPTIONS.map(o => ({ label: `${o.label} — ${o.hint}`, value: o.value }))"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Phone number" name="phone">
            <UInput
              v-model="registerState.phone"
              type="tel"
              autocomplete="tel"
              placeholder="+1 555 123 4567"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Business location" name="location">
            <UInput
              v-model="registerState.location"
              autocomplete="address-level2"
              placeholder="Beirut, Lebanon"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Estimated customers per month"
            name="estimatedCustomersPerMonth"
            hint="Your best estimate is fine"
          >
            <UInputNumber
              v-model="registerState.estimatedCustomersPerMonth"
              :min="1"
              :max="1000000"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Password"
            name="password"
            hint="At least 8 characters, with a letter and a number"
          >
            <UInput
              v-model="registerState.password"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Confirm password" name="confirmPassword">
            <UInput
              v-model="registerState.confirmPassword"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>

          <UButton type="submit" :loading="pending" block>
            Create account
          </UButton>

          <p class="text-xs text-muted">
            Your account is reviewed by an admin before you can sign in.
          </p>
        </UForm>

        <p class="mt-6 text-center text-sm text-muted">
          <template v-if="mode === 'signin'">
            New to InsightFlow?
            <UButton variant="link" color="primary" class="px-1" @click="mode = 'signup'">
              Create an account
            </UButton>
          </template>
          <template v-else>
            Already have an account?
            <UButton variant="link" color="primary" class="px-1" @click="mode = 'signin'">
              Sign in
            </UButton>
          </template>
        </p>
      </div>
    </div>
  </div>
</template>
