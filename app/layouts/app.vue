<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

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
const accountItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: displayName.value,
      icon: 'i-lucide-user',
      type: 'label'
    }
  ],
  [
    { label: 'Home', icon: 'i-lucide-house', to: '/' },
    { label: 'Insight feed', icon: 'i-lucide-newspaper', to: '/insights' }
  ],
  [
    { label: 'Log out', icon: 'i-lucide-log-out', color: 'error', onSelect: logout }
  ]
])

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
  <div class="min-h-[100dvh] bg-elevated/40 lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
    <aside class="hidden border-r border-white/10 bg-neutral-950 text-white lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:flex-col">
      <div class="flex h-20 shrink-0 items-center border-b border-white/10 px-6">
        <NuxtLink to="/" aria-label="InsightFlow home">
          <UiBrandMark />
        </NuxtLink>
      </div>

      <div class="flex min-h-0 flex-1 flex-col px-4 py-6">
        <p class="px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Workspace
        </p>
        <nav class="mt-3 space-y-1">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition"
            :class="isActive(link.to) ? 'bg-primary font-semibold text-primary-950' : 'text-neutral-300 hover:bg-white/10 hover:text-white'"
          >
            <UIcon :name="link.icon" class="size-5 shrink-0" />
            <span>{{ link.label }}</span>
          </NuxtLink>
        </nav>

        <div class="mt-auto border-t border-white/10 pt-5">
          <div class="flex items-center gap-3 px-3">
            <UAvatar :alt="displayName" size="sm" class="bg-primary text-primary-950" />
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-white">{{ displayName }}</p>
              <p class="mt-1 text-xs text-neutral-400">Business owner</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <UButton to="/" color="neutral" variant="ghost" icon="i-lucide-house" class="justify-start text-neutral-300 hover:text-white">
              Home
            </UButton>
            <UButton to="/insights" color="neutral" variant="ghost" icon="i-lucide-newspaper" class="justify-start text-neutral-300 hover:text-white">
              Insights
            </UButton>
          </div>
          <UButton
            class="mt-2 w-full justify-start text-neutral-300 hover:text-white"
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
          <UButton to="/" color="neutral" variant="ghost" icon="i-lucide-house" class="hidden sm:flex">
            Home
          </UButton>
          <UButton to="/insights" color="neutral" variant="ghost" icon="i-lucide-newspaper" class="hidden sm:flex">
            Insight feed
          </UButton>
          <UDropdownMenu :items="accountItems" :content="{ align: 'end' }">
            <UButton color="neutral" variant="ghost" trailing-icon="i-lucide-chevron-down" aria-label="Open account menu">
              <UAvatar :alt="displayName" size="sm" class="bg-primary text-primary-950" />
              <span class="hidden max-w-36 truncate sm:inline">{{ displayName }}</span>
            </UButton>
          </UDropdownMenu>
        </div>
      </header>

      <main class="mx-auto w-full max-w-[1560px] p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>

    <USlideover v-model:open="mobileOpen" side="left" title="Navigation">
      <template #body>
        <nav class="space-y-2" aria-label="Workspace navigation">
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
        <div class="mt-6 border-t border-default pt-6">
          <p class="px-3 text-xs font-semibold uppercase tracking-wider text-muted">Website</p>
          <nav class="mt-3 space-y-2" aria-label="Website navigation">
            <NuxtLink to="/" class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted hover:bg-elevated hover:text-default">
              <UIcon name="i-lucide-house" class="size-5" />
              Home
            </NuxtLink>
            <NuxtLink to="/insights" class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted hover:bg-elevated hover:text-default">
              <UIcon name="i-lucide-newspaper" class="size-5" />
              Insight feed
            </NuxtLink>
          </nav>
        </div>
      </template>
      <template #footer>
        <div class="w-full">
          <div class="mb-3 flex items-center gap-3 px-3">
            <UAvatar :alt="displayName" size="sm" class="bg-primary text-primary-950" />
            <p class="min-w-0 truncate text-sm font-semibold">{{ displayName }}</p>
          </div>
          <UButton class="w-full justify-start" color="neutral" variant="ghost" icon="i-lucide-log-out" @click="logout">
            Log out
          </UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
