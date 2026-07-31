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
          <NuxtLink to="/login" class="text-muted hover:text-default">
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
