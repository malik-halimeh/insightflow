<script setup lang="ts">
const { data: session } = await useFetch('/api/auth/session')

const displayName = computed(() =>
  session.value?.authenticated ? session.value.displayName : 'Signed out'
)

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  // Full load so the cleared cookie is what the next request carries.
  await navigateTo('/login', { external: true })
}
</script>

<template>
  <div class="min-h-screen flex flex-col md:flex-row">
    <aside class="md:w-56 md:shrink-0 border-b md:border-b-0 md:border-r border-default">
      <div class="flex md:flex-col md:h-full md:gap-6 items-center md:items-stretch justify-between md:justify-start gap-3 px-4 py-3">
        <div class="flex items-center gap-2 shrink-0">
          <NuxtLink to="/admin" class="font-semibold tracking-tight">
            InsightFlow
          </NuxtLink>
          <UBadge color="neutral" variant="subtle" size="sm">
            Admin
          </UBadge>
        </div>

        <nav class="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          <NuxtLink
            to="/admin"
            class="flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap text-muted hover:text-default hover:bg-elevated"
            active-class="text-default bg-elevated"
          >
            <UIcon name="i-lucide-shield-check" class="size-4 shrink-0" />
            <span>Business owners</span>
          </NuxtLink>
        </nav>

        <div class="md:mt-auto flex items-center md:items-stretch md:flex-col gap-2 shrink-0">
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
