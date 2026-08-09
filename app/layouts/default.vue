<script setup lang="ts">
const { data: session, status: sessionStatus } = await useFetch('/api/auth/session', { server: false })
const sessionPending = computed(() => ['idle', 'pending'].includes(sessionStatus.value))
</script>

<template>
  <div class="min-h-[100dvh] bg-elevated/30">
    <UiSiteHeader :session="session" :pending="sessionPending" />
    <main class="mx-auto min-h-[calc(100dvh-9rem)] w-full max-w-6xl px-4 py-10 sm:px-6"><slot /></main>
    <footer class="border-t border-default bg-default">
      <div class="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">InsightFlow, sales insights for small businesses.</div>
    </footer>
  </div>
</template>
