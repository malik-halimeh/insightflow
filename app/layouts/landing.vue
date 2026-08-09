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

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login', { external: true })
}
</script>

<template>
  <div class="min-h-[100dvh] bg-default">
    <header class="sticky top-0 z-50 border-b border-default bg-default/95 backdrop-blur">
      <div class="mx-auto flex h-18 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <NuxtLink to="/" aria-label="InsightFlow home">
          <UiBrandMark />
        </NuxtLink>

        <nav class="flex items-center gap-3 text-sm sm:gap-5">
          <NuxtLink to="/insights" class="hidden text-muted transition hover:text-default sm:inline">
            Insight feed
          </NuxtLink>

          <UButton v-if="isAuthenticated" :to="workspaceLink" icon="i-lucide-layout-dashboard" class="text-primary-950">
            {{ workspaceLabel }}
          </UButton>
          <template v-else-if="sessionReady">
            <NuxtLink to="/login" class="text-muted transition hover:text-default">
              Sign in
            </NuxtLink>
            <UButton to="/login?mode=signup" class="text-primary-950">
              Get started
            </UButton>
          </template>
          <USkeleton v-else class="h-9 w-24" />
        </nav>
      </div>
    </header>

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
                <li><button class="hover:text-primary" @click="logout">Log out</button></li>
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
