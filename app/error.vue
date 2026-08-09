<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const statusCode = computed(() => props.error?.statusCode ?? 500)
const notFound = computed(() => statusCode.value === 404)
const authenticationRequired = computed(() => statusCode.value === 401)

const heading = computed(() => {
  if (authenticationRequired.value) return 'Sign in to continue'
  if (statusCode.value === 403) return 'You cannot access this page'
  if (notFound.value) return 'That page is not here'
  return 'Something went wrong at our end'
})

const explanation = computed(() => {
  if (authenticationRequired.value) {
    return 'Your session may have ended. Sign in again and we will bring you back into InsightFlow.'
  }

  if (statusCode.value === 403) {
    return 'Your account does not have permission to open this page. Your data has not been changed.'
  }

  if (notFound.value) {
    return 'The link may be out of date, or the insight it pointed to may have been unpublished by the business that shared it.'
  }

  return 'Your data is safe. Nothing you have uploaded has been changed or lost. This is a problem on our side, not with your account.'
})

function goHome() {
  clearError({ redirect: '/' })
}

function tryAgain() {
  clearError({ redirect: useRoute().fullPath })
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-default">
      <div class="mx-auto w-full max-w-4xl px-4 py-4">
        <NuxtLink to="/" class="font-semibold tracking-tight">
          InsightFlow
        </NuxtLink>
      </div>
    </header>

    <main class="flex flex-1 items-center">
      <div class="mx-auto w-full max-w-4xl px-4 py-8">
        <div class="max-w-xl">
          <UIcon
            :name="notFound ? 'i-lucide-map-pin-off' : authenticationRequired ? 'i-lucide-log-in' : 'i-lucide-unplug'"
            class="size-8 text-muted"
          />

          <h1 class="mt-8 text-2xl font-semibold tracking-tight">
            {{ heading }}
          </h1>

          <p class="mt-4 text-lg text-muted">
            {{ explanation }}
          </p>

          <div class="mt-8 flex flex-wrap gap-4">
            <UButton
              v-if="authenticationRequired"
              to="/login"
              icon="i-lucide-log-in"
            >
              Sign in
            </UButton>

            <UButton
              v-else-if="!notFound"
              icon="i-lucide-rotate-ccw"
              @click="tryAgain"
            >
              Try again
            </UButton>

            <UButton
              v-if="notFound"
              to="/insights"
              icon="i-lucide-newspaper"
            >
              Read the insight feed
            </UButton>

            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-house"
              @click="goHome"
            >
              Go to the home page
            </UButton>
          </div>

          <p
            v-if="!notFound && !authenticationRequired"
            class="mt-8 text-sm text-muted"
          >
            If this keeps happening, tell us what you were doing just before it
            appeared. That is usually enough to find the problem.
          </p>
        </div>
      </div>
    </main>

    <footer class="border-t border-default">
      <div class="mx-auto w-full max-w-4xl px-4 py-4 text-sm text-muted">
        InsightFlow, sales insights for small businesses.
      </div>
    </footer>
  </div>
</template>
