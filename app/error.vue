<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const statusCode = computed(() => props.error.statusCode || 500)

const title = computed(() => {
  if (statusCode.value === 401) {
    return 'Please sign in to continue'
  }

  if (statusCode.value === 403) {
    return 'You cannot access this page'
  }

  if (statusCode.value === 404) {
    return 'Page not found'
  }

  return 'Something went wrong'
})

const description = computed(() => {
  if (props.error.statusMessage) {
    return props.error.statusMessage
  }

  if (statusCode.value === 404) {
    return 'The page you are looking for does not exist or may have moved.'
  }

  return 'The page could not be loaded. Try again or return to the home page.'
})

async function retry() {
  await clearError()
}

async function goHome() {
  await clearError({
    redirect: '/'
  })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <UCard class="w-full max-w-lg">
      <div class="space-y-8">
        <div class="space-y-2">
          <p class="text-xs text-muted">
            Error {{ statusCode }}
          </p>

          <h1 class="text-2xl font-semibold tracking-tight">
            {{ title }}
          </h1>

          <p class="text-sm text-muted">
            {{ description }}
          </p>
        </div>

        <div class="flex gap-2">
          <UButton @click="retry">
            Try again
          </UButton>

          <UButton
            color="neutral"
            variant="subtle"
            @click="goHome"
          >
            Go back home
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>