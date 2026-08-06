<!--
  OWNER: M4 (recommendations and publishing)

  WHAT THIS IS
  The page every error in the whole app lands on. Nuxt renders this instead of the
  normal page, so it must stand on its own.

  WHO READS IT
  A restaurant owner, usually on a phone, usually mid-shift. They do not know what
  a status code is and cannot act on one. So this page never shows a number, never
  says "error", and never uses a word they would have to look up.

  THE TWO CASES
  - Not found: the address is wrong, or the thing was removed. The owner did
    nothing wrong and there is nothing to fix. Point them somewhere real.
  - Something broke: our fault. The important thing an owner wants to know is
    whether their data survived, so say so plainly before anything else.

  WHAT TO REPLACE
  Nothing is dummy here. This page is finished and works as it stands.

  WHAT NOT TO CHANGE
  - No status codes on screen. "404" tells an owner nothing.
  - No apologising. "Sorry!" wastes the line that should be telling them what to
    do. Errors are direct, not sheepish.
  - Keep the reassurance about their data on the 500 case. It is the actual
    question in the reader's head.
  - The class names. They come from docs/DESIGN-SYSTEM.md.
-->

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

// The only thing the code decides is which of two messages to show. It is never
// printed: a number an owner cannot act on is noise dressed as information.
const notFound = computed(() => props.error?.statusCode === 404)

const heading = computed(() =>
  notFound.value ? 'That page is not here' : 'Something went wrong at our end'
)

const explanation = computed(() =>
  notFound.value
    ? 'The link may be out of date, or the insight it pointed to may have been unpublished by the business that shared it.'
    : 'Your data is safe. Nothing you have uploaded has been changed or lost. This is a problem on our side, not with your account.'
)

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
      <div class="mx-auto w-full max-w-4xl px-4 py-3">
        <NuxtLink to="/" class="font-semibold tracking-tight">
          InsightFlow
        </NuxtLink>
      </div>
    </header>

    <main class="flex flex-1 items-center">
      <div class="mx-auto w-full max-w-4xl px-4 py-16">
        <div class="max-w-xl">
          <UIcon
            :name="notFound ? 'i-lucide-map-pin-off' : 'i-lucide-unplug'"
            class="size-8 text-muted"
          />

          <h1 class="mt-6 text-3xl font-semibold tracking-tight">
            {{ heading }}
          </h1>

          <p class="mt-4 text-lg text-muted">
            {{ explanation }}
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <!-- Retrying only makes sense when the page might work next time. -->
            <UButton v-if="!notFound" icon="i-lucide-rotate-ccw" @click="tryAgain">
              Try again
            </UButton>

            <UButton v-if="notFound" to="/insights" icon="i-lucide-newspaper">
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

          <p v-if="!notFound" class="mt-8 text-sm text-muted">
            If this keeps happening, it is worth telling us what you were doing
            just before it appeared. That is usually enough to find it.
          </p>
        </div>
      </div>
    </main>

    <footer class="border-t border-default">
      <div class="mx-auto w-full max-w-4xl px-4 py-4 text-sm text-muted">
        InsightFlow — sales insights for small businesses.
      </div>
    </footer>
  </div>
</template>
