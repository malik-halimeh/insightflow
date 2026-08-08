<script setup lang="ts">
const links = [
  { to: '/dashboard', label: 'Dashboard', icon: 'i-lucide-layout-dashboard' },
  { to: '/datasets', label: 'Data sets', icon: 'i-lucide-table' },
  { to: '/recommendations', label: 'Recommendations', icon: 'i-lucide-lightbulb' }
]

const route = useRoute()
const mobileOpen = ref(false)
const { data: session } = await useFetch('/api/auth/session')

const displayName = computed(() =>
  session.value?.authenticated ? session.value.displayName : 'Signed out'
)

watch(() => route.fullPath, () => {
  mobileOpen.value = false
})

function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`)
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login', { external: true })
}
</script>

<template>
  <div class="min-h-[100dvh] bg-elevated/40 lg:grid lg:grid-cols-[76px_252px_minmax(0,1fr)]">
    <aside class="hidden border-r border-white/10 bg-neutral-950 text-white lg:flex lg:min-h-[100dvh] lg:flex-col lg:items-center lg:py-5">
      <NuxtLink to="/" aria-label="InsightFlow home">
        <UiBrandMark compact />
      </NuxtLink>

      <nav class="mt-10 flex flex-1 flex-col gap-3">
        <UTooltip v-for="link in links" :key="link.to" :text="link.label" :content="{ side: 'right' }">
          <NuxtLink
            :to="link.to"
            :aria-label="link.label"
            class="flex size-11 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-white/10 hover:text-white"
            :class="isActive(link.to) ? 'bg-primary text-primary-950 hover:bg-primary hover:text-primary-950' : ''"
          >
            <UIcon :name="link.icon" class="size-5" />
          </NuxtLink>
        </UTooltip>
      </nav>

      <UAvatar :alt="displayName" size="md" class="bg-primary text-primary-950" />
    </aside>

    <aside class="hidden border-r border-default bg-default lg:flex lg:min-h-[100dvh] lg:flex-col">
      <div class="flex h-20 items-center border-b border-default px-6">
        <NuxtLink to="/" aria-label="InsightFlow home">
          <UiBrandMark />
        </NuxtLink>
      </div>

      <div class="flex flex-1 flex-col px-4 py-6">
        <p class="px-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Workspace
        </p>
        <nav class="mt-3 space-y-1">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition"
            :class="isActive(link.to) ? 'bg-primary/15 font-semibold text-primary-800 dark:text-primary-300' : 'text-muted hover:bg-elevated hover:text-default'"
          >
            <UIcon :name="link.icon" class="size-4.5 shrink-0" />
            <span>{{ link.label }}</span>
          </NuxtLink>
        </nav>

        <div class="mt-auto border-t border-default pt-5">
          <p class="truncate px-3 text-sm font-semibold text-default">
            {{ displayName }}
          </p>
          <UButton
            class="mt-3 w-full justify-start"
            color="neutral"
            variant="ghost"
            icon="i-lucide-log-out"
            @click="logout"
          >
            Log out
          </UButton>
        </div>
      </div>
    </aside>

    <div class="min-w-0">
      <header class="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-default bg-default/95 px-4 backdrop-blur lg:h-20 lg:px-8">
        <div class="flex items-center gap-3 lg:hidden">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-menu"
            aria-label="Open navigation"
            @click="mobileOpen = true"
          />
          <NuxtLink to="/" aria-label="InsightFlow home">
            <UiBrandMark />
          </NuxtLink>
        </div>

        <div class="hidden lg:block">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted">
            Business intelligence
          </p>
          <p class="mt-1 text-sm text-default">
            Turn sales data into clear decisions.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <UButton color="neutral" variant="ghost" icon="i-lucide-bell" aria-label="Notifications" />
          <UAvatar :alt="displayName" size="sm" class="bg-primary text-primary-950" />
        </div>
      </header>

      <main class="mx-auto w-full max-w-[1560px] p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>

    <USlideover v-model:open="mobileOpen" side="left" title="Navigation">
      <template #body>
        <nav class="space-y-2">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm"
            :class="isActive(link.to) ? 'bg-primary/15 font-semibold text-primary-800 dark:text-primary-300' : 'text-muted hover:bg-elevated hover:text-default'"
          >
            <UIcon :name="link.icon" class="size-5" />
            {{ link.label }}
          </NuxtLink>
        </nav>
      </template>
      <template #footer>
        <UButton class="w-full justify-start" color="neutral" variant="ghost" icon="i-lucide-log-out" @click="logout">
          Log out
        </UButton>
      </template>
    </USlideover>
  </div>
</template>
