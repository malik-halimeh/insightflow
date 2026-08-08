<script setup lang="ts">
/**
 * Only used by `/`. Same header and footer as the default layout, but without
 * the `max-w-4xl` content wrapper, so the landing page's sections can each pick
 * their own width: full-bleed bands with a contained row inside, rather than
 * the whole page pinned to one column width the way the workspace is.
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
      <div class="mx-auto w-full max-w-6xl px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
            <NuxtLink :to="workspaceLink" class="text-muted hover:text-default">
              {{ workspaceLabel }}
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
      <slot />
    </main>

    <footer class="border-t border-default">
      <div class="mx-auto w-full max-w-6xl px-4 py-10">
        <div class="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div class="max-w-sm">
            <div class="flex items-center gap-2 font-semibold tracking-tight">
              <span class="flex size-6 items-center justify-center rounded-md bg-primary on-accent">
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
                    Get started
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="mt-8 flex flex-col gap-2 border-t border-default pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>InsightFlow. A business intelligence tool for small businesses.</p>
          <p>© {{ new Date().getFullYear() }} InsightFlow</p>
        </div>
      </div>
    </footer>
  </div>
</template>
