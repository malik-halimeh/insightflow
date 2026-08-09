<script setup lang="ts">
const { data: session, status: sessionStatus } = await useFetch('/api/auth/session', { server: false })

const sessionReady = computed(() => !['idle', 'pending'].includes(sessionStatus.value))
const isAuthenticated = computed(() => session.value?.authenticated === true)

const workspaceLink = computed(() =>
  session.value?.authenticated === true && session.value.role === 'admin' ? '/admin' : '/dashboard'
)
const workspaceLabel = computed(() =>
  session.value?.authenticated === true && session.value.role === 'admin' ? 'Admin dashboard' : 'Dashboard'
)
</script>

<template>
  <div class="min-h-[100dvh] bg-default">
    <UiSiteHeader
      :session="session"
      :pending="!sessionReady"
      show-signup
    />

    <main>
      <slot />
    </main>

    <footer class="border-t border-default bg-neutral-950 text-neutral-300">
      <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div class="max-w-sm">
            <UiBrandMark />
            <p class="mt-4 text-sm leading-6 text-neutral-400">
              Plain-language sales insights for small businesses. Upload your data,
              see what matters, act the same day.
            </p>
          </div>

          <div class="text-sm">
            <p class="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Product
            </p>
            <ul class="mt-4 space-y-3">
              <li><NuxtLink to="/insights" class="hover:text-primary">Insight feed</NuxtLink></li>
              <template v-if="isAuthenticated">
                <li><NuxtLink :to="workspaceLink" class="hover:text-primary">{{ workspaceLabel }}</NuxtLink></li>
              </template>
              <template v-else-if="sessionReady">
                <li><NuxtLink to="/login" class="hover:text-primary">Sign in</NuxtLink></li>
                <li><NuxtLink to="/login?mode=signup" class="hover:text-primary">Create an account</NuxtLink></li>
              </template>
            </ul>
          </div>
        </div>

        <div class="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-neutral-400 sm:flex-row sm:justify-between">
          <p>InsightFlow, a business intelligence tool for small businesses.</p>
          <p>© {{ new Date().getFullYear() }} InsightFlow</p>
        </div>
      </div>
    </footer>
  </div>
</template>
