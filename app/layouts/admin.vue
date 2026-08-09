<script setup lang="ts">
const { data: session, status: sessionStatus } = await useFetch('/api/auth/session')
const sessionPending = computed(() => ['idle', 'pending'].includes(sessionStatus.value))

const displayName = computed(() => session.value?.authenticated ? session.value.displayName : 'Signed out')
</script>

<template>
  <div class="min-h-[100dvh] bg-elevated/40 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
    <aside class="border-b border-default bg-neutral-950 text-white lg:min-h-[100dvh] lg:border-b-0 lg:border-r lg:border-white/10">
      <div class="flex h-18 items-center justify-between px-5 lg:h-20 lg:border-b lg:border-white/10">
        <NuxtLink to="/admin"><UiBrandMark /></NuxtLink>
        <UBadge color="primary" variant="subtle">Admin</UBadge>
      </div>
      <div class="flex items-center justify-between gap-3 px-4 pb-4 lg:min-h-[calc(100dvh-5rem)] lg:flex-col lg:items-stretch lg:py-6">
        <nav>
          <NuxtLink to="/admin" class="flex items-center gap-3 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-950">
            <UIcon name="i-lucide-shield-check" class="size-5" />
            <span>Business owners</span>
          </NuxtLink>
        </nav>
        <div class="flex items-center gap-3 lg:mt-auto lg:border-t lg:border-white/10 lg:pt-5">
          <UAvatar :alt="displayName" size="sm" class="bg-primary text-primary-950" />
          <div class="hidden min-w-0 flex-1 sm:block">
            <p class="truncate text-sm font-semibold">{{ displayName }}</p>
            <p class="mt-1 text-xs text-neutral-400">Administrator</p>
          </div>
        </div>
      </div>
    </aside>

    <div class="min-w-0">
      <UiSiteHeader
        :session="session"
        :pending="sessionPending"
        :contained="false"
        hide-desktop-brand
      />
      <main class="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8"><slot /></main>
    </div>
  </div>
</template>
