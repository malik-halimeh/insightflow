<script setup lang="ts">
/**
 * Checked in the browser only, never during rendering. Two reasons, both of which
 * would be bugs rather than inefficiencies:
 *
 *   '/' is prerendered, so its HTML is built once at deploy time with nobody signed
 *   in. A server-rendered header would say "Sign in" to everyone, for ever.
 *
 *   '/insights' is cached with swr, so a server-rendered header would store one
 *   visitor's session state and hand it to the next person who asked.
 *
 * `server: false` keeps this page HTML identical for everybody and swaps the link
 * after hydration, for whoever is actually holding the browser.
 */
const { data: session } = await useFetch('/api/auth/session', { server: false })

// An admin has no /dashboard to go back to — the middleware would bounce them to
// /admin anyway, so the link may as well say where it actually goes.
const isAdmin = computed(() => session.value?.authenticated && session.value.role === 'admin')
const workspace = computed(() =>
  isAdmin.value ? { to: '/admin', label: 'Admin' } : { to: '/dashboard', label: 'Dashboard' }
)
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-default">
      <!-- Wraps rather than collapsing to a menu: two links do not need one. -->
      <div class="mx-auto w-full max-w-4xl px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <NuxtLink to="/" class="font-semibold tracking-tight">
          InsightFlow
        </NuxtLink>

        <nav class="flex items-center gap-4 text-sm">
          <NuxtLink to="/insights" class="text-muted hover:text-default">
            Insight feed
          </NuxtLink>
          <NuxtLink
            v-if="session?.authenticated"
            :to="workspace.to"
            class="text-muted hover:text-default"
          >
            {{ workspace.label }}
          </NuxtLink>
          <NuxtLink v-else to="/login" class="text-muted hover:text-default">
            Sign in
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <div class="mx-auto w-full max-w-4xl px-4 py-8">
        <slot />
      </div>
    </main>

    <footer class="border-t border-default">
      <div class="mx-auto w-full max-w-4xl px-4 py-4 text-sm text-muted">
        InsightFlow — sales insights for small businesses.
      </div>
    </footer>
  </div>
</template>
