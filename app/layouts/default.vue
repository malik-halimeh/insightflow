<script setup lang="ts">
/**
 * The public shell, used by the insight feed and by a single published insight.
 * The workspace has its own layout; this one is what a stranger sees, so it
 * carries the same mark and the same sign-up route as the landing page rather
 * than a bare wordmark on a rule.
 *
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

// An admin has no /dashboard to go back to, and the middleware would bounce them to
// /admin anyway, so the link may as well say where it actually goes.
const isAdmin = computed(() => session.value?.authenticated && session.value.role === 'admin')
const workspace = computed(() =>
  isAdmin.value ? { to: '/admin', label: 'Admin' } : { to: '/dashboard', label: 'Dashboard' }
)
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="sticky top-0 z-50 border-b border-default bg-default/80 backdrop-blur">
      <!-- Wraps rather than collapsing to a menu: two links do not need one. -->
      <div class="mx-auto w-full max-w-5xl px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
          <span class="flex size-7 items-center justify-center rounded-md bg-primary on-accent">
            <UIcon name="i-lucide-chart-column" class="size-4" />
          </span>
          InsightFlow
        </NuxtLink>

        <!--
          One line at every width. Below sm the bar cannot hold four things, so the
          feed link shortens and "Sign in" drops out. Nothing becomes unreachable:
          "Get started" opens /login, where signing in is the other tab.
        -->
        <nav class="flex items-center gap-4 text-sm">
          <NuxtLink to="/insights" class="text-muted hover:text-default">
            <span class="sm:hidden">Insights</span>
            <span class="hidden sm:inline">Insight feed</span>
          </NuxtLink>

          <template v-if="session?.authenticated">
            <NuxtLink :to="workspace.to" class="text-muted hover:text-default">
              {{ workspace.label }}
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="hidden text-muted hover:text-default sm:inline">
              Sign in
            </NuxtLink>
            <UButton to="/login?mode=signup" size="sm">
              Get started
            </UButton>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <div class="mx-auto w-full max-w-5xl px-4 py-10">
        <slot />
      </div>
    </main>

    <footer class="border-t border-default">
      <div class="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>InsightFlow. Sales insights for small businesses.</p>
        <p>© {{ new Date().getFullYear() }} InsightFlow</p>
      </div>
    </footer>
  </div>
</template>
