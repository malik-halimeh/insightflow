<script setup lang="ts">
import {
  BUSINESS_SIZE_OPTIONS,
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput
} from '#shared/schemas'
import type { FormSubmitEvent, TabsItem } from '@nuxt/ui'

// No auth middleware here on purpose: gating the login page would send anyone who
// is signed out into a redirect loop.
definePageMeta({ layout: false })

// One sign-in form for every account. There is deliberately no "Business owner"
// / "Admin" choice on this page. The server identifies the account by username or
// email and returns its real role, and that role decides where the person lands.
// Offering the choice here would invite someone to pick "Admin" and would put a
// value the client controls anywhere near an access decision.
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

async function onSignIn(event: FormSubmitEvent<LoginInput>) {
  serverError.value = null
  successMessage.value = null
  pending.value = true

  try {
    // The server decides the redirect from the role on the matched account.
    const { redirect } = await $fetch('/api/auth/login', { method: 'POST', body: event.data })

    // An explicit ?redirect wins, so a link that sent someone here from a
    // specific page returns them to it.
    const target = typeof route.query.redirect === 'string' ? route.query.redirect : redirect

    // A full page load rather than a client-side transition, so the browser sends
    // the new httpOnly cookie and the destination renders as a signed-in request.
    await navigateTo(target, { external: true })
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
    // No cookie is set and no redirect happens: the account cannot sign in until
    // an admin approves it, so saying so here is the whole point of this screen.
    successMessage.value = 'Your account has been created. An admin will review it shortly, and you can sign in as soon as it is approved.'
    mode.value = 'signin'
    loginState.identifier = registerState.username
  } catch (error) {
    serverError.value = (error as { statusMessage?: string }).statusMessage
      ?? 'We could not create your account. Please try again.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <!--
    Split screen. The brand panel is the reason someone is filling this form in,
    so it carries the product's own output rather than a slogan, and it is hidden
    below lg where a second column would only push the form off the fold.
  -->
  <div class="min-h-[100dvh] lg:grid lg:grid-cols-2">
    <!--
      The palette's #D97706 at full strength, carrying its #09090B rather than
      white: white on amber 600 is 3.18:1, the near-black is 6.25:1. Pinned to the
      600 step rather than the semantic token, so the panel is the same amber in
      light and in dark and nothing here has to flip.

      The overlays are black at low alpha rather than white, for the same reason:
      a white wash on a light accent barely separates, a dark one does.
    -->
    <aside class="on-accent relative hidden overflow-hidden bg-primary-600 p-12 lg:flex lg:flex-col lg:justify-between">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
        <span class="flex size-7 items-center justify-center rounded-md bg-black/10">
          <UIcon name="i-lucide-chart-column" class="size-4" />
        </span>
        InsightFlow
      </NuxtLink>

      <div class="max-w-md">
        <h2 class="on-accent text-4xl font-semibold leading-[1.05] tracking-tight">
          Your sales, in plain language.
        </h2>
        <p class="mt-4 text-lg leading-relaxed opacity-80">
          Upload a spreadsheet. Get findings you can act on the same afternoon.
        </p>

        <div class="mt-10 rounded-[calc(var(--ui-radius)*1.5)] bg-black/[0.07] p-6 ring-1 ring-inset ring-black/10">
          <p class="text-sm opacity-85">
            A finding, as your workspace writes it
          </p>
          <p class="mt-3 text-xl font-semibold leading-snug">
            Saturdays take 32% more than an average day here.
          </p>
          <p class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium">
            <UIcon name="i-lucide-arrow-up-right" class="size-4" />
            +32.4%
            <span class="font-normal opacity-85">Saturday against the weekly average</span>
          </p>
        </div>
      </div>

      <ul class="space-y-3 text-sm opacity-90">
        <li class="flex items-start gap-2.5">
          <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0" />
          Free to sign up, with no card and no setup call
        </li>
        <li class="flex items-start gap-2.5">
          <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0" />
          Your data is yours. Publishing shares a change, never a figure
        </li>
        <li class="flex items-start gap-2.5">
          <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0" />
          Every business account is reviewed before it goes live
        </li>
      </ul>
    </aside>

    <div class="flex min-h-[100dvh] items-center justify-center p-6 lg:min-h-0">
      <div class="w-full max-w-sm">
        <NuxtLink
          to="/"
          class="mb-8 flex items-center gap-2 font-semibold tracking-tight lg:hidden"
        >
          <span class="flex size-7 items-center justify-center rounded-md bg-primary on-accent">
            <UIcon name="i-lucide-chart-column" class="size-4" />
          </span>
          InsightFlow
        </NuxtLink>

        <h1 class="text-2xl font-semibold tracking-tight">
          {{ mode === 'signin' ? 'Sign in to InsightFlow' : 'Create your account' }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          {{ mode === 'signin'
            ? 'Pick up where your last upload left off.'
            : 'Tell us about your business and an admin will review it shortly.' }}
        </p>

        <UTabs v-model="mode" :items="authTabs" class="my-6" />

        <UAlert
          v-if="successMessage"
          class="mb-4"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          :description="successMessage"
        />

        <UAlert
          v-if="serverError"
          class="mb-4"
          color="error"
          variant="subtle"
          :description="serverError"
        />

        <UForm
          v-if="mode === 'signin'"
          :schema="loginSchema"
          :state="loginState"
          class="space-y-4"
          @submit="onSignIn"
        >
          <UFormField label="Username or email" name="identifier">
            <UInput v-model="loginState.identifier" autocomplete="username" class="w-full" />
          </UFormField>

          <UFormField label="Password" name="password">
            <UInput
              v-model="loginState.password"
              type="password"
              autocomplete="current-password"
              class="w-full"
            />
            <template #hint>
              <NuxtLink to="/forgot-password" class="ink-accent hover:underline">
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
          class="space-y-4"
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
              :items="BUSINESS_SIZE_OPTIONS.map(option => ({ label: `${option.label} (${option.hint})`, value: option.value }))"
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
            An admin reviews your account before you can sign in.
          </p>
        </UForm>
      </div>
    </div>
  </div>
</template>
