<script setup lang="ts">
const { data: session } = await useFetch('/api/auth/session', { server: false })

const isAdmin = computed(() => session.value?.authenticated && session.value.role === 'admin')
const workspace = computed(() =>
  isAdmin.value ? { to: '/admin', label: 'Admin' } : { to: '/dashboard', label: 'Dashboard' }
)
</script>

<template>
  <div class="min-h-[100dvh] bg-elevated/30">
    <header class="border-b border-default bg-default">
      <div class="mx-auto flex h-18 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <NuxtLink to="/" aria-label="InsightFlow home"><UiBrandMark /></NuxtLink>
        <nav class="flex items-center gap-5 text-sm">
          <NuxtLink to="/insights" class="text-muted transition hover:text-default">Insight feed</NuxtLink>
          <NuxtLink v-if="session?.authenticated" :to="workspace.to" class="text-muted transition hover:text-default">{{ workspace.label }}</NuxtLink>
          <NuxtLink v-else to="/login" class="text-muted transition hover:text-default">Sign in</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="mx-auto min-h-[calc(100dvh-9rem)] w-full max-w-6xl px-4 py-10 sm:px-6"><slot /></main>
    <footer class="border-t border-default bg-default">
      <div class="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">InsightFlow, sales insights for small businesses.</div>
    </footer>
  </div>
</template>
