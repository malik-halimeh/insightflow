<script setup lang="ts">
const links = [
  { to: '/dashboard', label: 'Dashboard', icon: 'i-lucide-layout-dashboard' },
  { to: '/datasets', label: 'Data sets', icon: 'i-lucide-table' },
  { to: '/recommendations', label: 'Recommendations', icon: 'i-lucide-lightbulb' }
]

const { data: session } = await useFetch('/api/auth/session')

const displayName = computed(() =>
  session.value?.authenticated ? session.value.username : 'Signed out'
)

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  // Full load so the cleared cookie is what the next request carries.
  await navigateTo('/login', { external: true })
}
</script>

<template>
  <!-- Below md the sidebar becomes a horizontal bar above the content. -->
  <div class="min-h-screen flex flex-col md:flex-row">
    <aside class="md:w-56 md:shrink-0 border-b md:border-b-0 md:border-r border-default">
      <div class="flex md:flex-col md:h-full md:gap-6 items-center md:items-stretch justify-between md:justify-start gap-3 px-4 py-3">
        <NuxtLink to="/" class="font-semibold tracking-tight shrink-0">
          InsightFlow
        </NuxtLink>

        <!-- Scrolls sideways rather than wrapping, so three links never become two rows on a narrow phone. -->
        <nav class="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap text-muted hover:text-default hover:bg-elevated"
            active-class="text-default bg-elevated"
          >
            <UIcon :name="link.icon" class="size-4 shrink-0" />
            <span>{{ link.label }}</span>
          </NuxtLink>
        </nav>

        <div class="md:mt-auto flex items-center md:items-stretch md:flex-col gap-2 shrink-0">
          <!-- Hidden on the narrowest screens: the logout button matters more than the name. -->
          <span class="hidden sm:inline text-sm text-muted truncate">{{ displayName }}</span>
          <UButton
            size="xs"
            color="neutral"
            variant="subtle"
            icon="i-lucide-log-out"
            @click="logout"
          >
            <span class="hidden sm:inline">Log out</span>
          </UButton>
        </div>
      </div>
    </aside>

    <main class="flex-1 min-w-0">
      <div class="px-4 py-6 md:px-8">
        <slot />
      </div>
    </main>
  </div>
</template>
