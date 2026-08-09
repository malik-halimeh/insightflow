<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { UserRole } from '#shared/schemas'

type HeaderSession =
  | { authenticated: false }
  | {
      authenticated: true
      displayName: string
      role: UserRole
    }

const props = withDefaults(defineProps<{
  session?: HeaderSession | null
  pending?: boolean
  contained?: boolean
  hideDesktopBrand?: boolean
  showNavigationToggle?: boolean
  showSignup?: boolean
}>(), {
  session: null,
  pending: false,
  contained: true,
  hideDesktopBrand: false,
  showNavigationToggle: false,
  showSignup: false
})

const emit = defineEmits<{
  openNavigation: []
}>()

const config = useRuntimeConfig()

const isAuthenticated = computed(() => props.session?.authenticated === true)
const displayName = computed(() =>
  props.session?.authenticated ? props.session.displayName : 'Account'
)
const isAdmin = computed(() =>
  props.session?.authenticated === true && props.session.role === 'admin'
)
const workspaceLink = computed(() => isAdmin.value ? '/admin' : '/dashboard')
const workspaceLabel = computed(() => isAdmin.value ? 'Admin dashboard' : 'Dashboard')

const ownerDestinations = computed<DropdownMenuItem[]>(() => {
  const destinations: DropdownMenuItem[] = [
    { label: 'Home', icon: 'i-lucide-house', to: '/' },
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
    { label: 'Data sets', icon: 'i-lucide-table', to: '/datasets' },
    { label: 'Recommendations', icon: 'i-lucide-lightbulb', to: '/recommendations' }
  ]

  if (config.public.forecastEnabled) {
    destinations.push({ label: 'Forecast', icon: 'i-lucide-trending-up', to: '/forecast' })
  }

  destinations.push({ label: 'Insight feed', icon: 'i-lucide-newspaper', to: '/insights' })
  return destinations
})

const accountItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: displayName.value,
      icon: 'i-lucide-user',
      type: 'label'
    }
  ],
  isAdmin.value
    ? [
        { label: 'Home', icon: 'i-lucide-house', to: '/' },
        { label: 'Admin dashboard', icon: 'i-lucide-shield-check', to: '/admin' },
        { label: 'Insight feed', icon: 'i-lucide-newspaper', to: '/insights' }
      ]
    : ownerDestinations.value,
  [
    { label: 'Log out', icon: 'i-lucide-log-out', color: 'error', onSelect: logout }
  ]
])

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login', { external: true })
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-default bg-default/95 backdrop-blur">
    <div
      class="flex h-18 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      :class="contained ? 'mx-auto max-w-7xl' : ''"
    >
      <div
        class="flex min-w-0 items-center gap-2"
        :class="hideDesktopBrand ? 'lg:hidden' : ''"
      >
        <UButton
          v-if="showNavigationToggle"
          class="lg:hidden"
          color="neutral"
          variant="ghost"
          icon="i-lucide-menu"
          aria-label="Open navigation"
          @click="emit('openNavigation')"
        />
        <NuxtLink to="/" aria-label="InsightFlow home">
          <UiBrandMark />
        </NuxtLink>
      </div>

      <nav class="flex min-w-0 items-center gap-2 text-sm sm:gap-4" aria-label="Primary navigation">
        <template v-if="pending">
          <USkeleton class="h-9 w-24" />
        </template>

        <template v-else-if="isAuthenticated">
          <UButton
            :to="workspaceLink"
            color="neutral"
            variant="ghost"
            icon="i-lucide-layout-dashboard"
            class="hidden sm:flex"
          >
            {{ workspaceLabel }}
          </UButton>
          <UButton
            to="/insights"
            color="neutral"
            variant="ghost"
            icon="i-lucide-newspaper"
            class="hidden md:flex"
          >
            Insight feed
          </UButton>
          <UDropdownMenu :items="accountItems" :content="{ align: 'end' }">
            <UButton
              color="neutral"
              variant="ghost"
              trailing-icon="i-lucide-chevron-down"
              aria-label="Open account menu"
            >
              <UAvatar :alt="displayName" size="sm" class="bg-primary text-primary-950" />
              <span class="hidden max-w-36 truncate sm:inline">{{ displayName }}</span>
            </UButton>
          </UDropdownMenu>
        </template>

        <template v-else>
          <NuxtLink to="/insights" class="hidden text-muted transition hover:text-default sm:inline">
            Insight feed
          </NuxtLink>
          <NuxtLink to="/login" class="text-muted transition hover:text-default">
            Sign in
          </NuxtLink>
          <UButton v-if="showSignup" to="/login?mode=signup" class="text-primary-950">
            Get started
          </UButton>
        </template>
      </nav>
    </div>
  </header>
</template>
