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

const workspaceLink = computed(() =>
  session.value?.authenticated && session.value.role === 'admin' ? '/admin' : '/dashboard'
)
const workspaceLabel = computed(() =>
  session.value?.authenticated && session.value.role === 'admin' ? 'Admin dashboard' : 'Dashboard'
)
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="sticky top-0 z-50 border-b border-default bg-default/80 backdrop-blur">
      <!-- Wraps rather than collapsing to a menu: three links do not need one. -->
      <div class="mx-auto w-full max-w-6xl px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
          <span class="flex size-7 items-center justify-center rounded-md bg-primary text-inverted">
            <UIcon name="i-lucide-chart-column" class="size-4" />
          </span>
          InsightFlow
        </NuxtLink>

        <nav class="flex items-center gap-4 text-sm">
          <NuxtLink to="/insights" class="text-muted hover:text-default">
            Insight feed
          </NuxtLink>

          <template v-if="session?.authenticated">
            <NuxtLink :to="workspaceLink" class="text-muted hover:text-default">
              {{ workspaceLabel }}
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="text-muted hover:text-default">
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
      <div class="mx-auto w-full max-w-4xl px-4 py-8">
        <slot />
      </div>
    </main>

    <footer class="border-t border-default">
      <div class="mx-auto w-full max-w-6xl px-4 py-10">
        <div class="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div class="max-w-sm">
            <div class="flex items-center gap-2 font-semibold tracking-tight">
              <span class="flex size-6 items-center justify-center rounded-md bg-primary text-inverted">
                <UIcon name="i-lucide-chart-column" class="size-3.5" />
              </span>
              InsightFlow
            </div>
            <p class="mt-2 text-sm text-muted">
              Plain-language sales insights for small businesses. Upload your data,
              see what matters, act the same day.
            </p>
          </div>

          <div class="flex gap-12 text-sm">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Product
              </p>
              <ul class="mt-3 space-y-2">
                <li>
                  <NuxtLink to="/insights" class="text-muted hover:text-default">
                    Insight feed
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/login" class="text-muted hover:text-default">
                    Sign in
                  </NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/login?mode=signup" class="text-muted hover:text-default">
                    Create an account
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="mt-8 flex flex-col gap-2 border-t border-default pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>InsightFlow — a business intelligence tool for small businesses.</p>
          <p>© {{ new Date().getFullYear() }} InsightFlow</p>
        </div>
      </div>
    </footer>
  </div>
</template>
