<script setup lang="ts">
import type { HomeStats } from '#shared/types/home'

definePageMeta({ layout: 'landing' })

const { data: homeStats } = await useFetch<HomeStats>('/api/home-stats', {
  server: false,
  default: (): HomeStats => ({ insightCount: 0, businessCount: 0, latestInsight: null })
})
const { data: session, status: sessionStatus } = await useFetch('/api/auth/session', { server: false })

const sessionReady = computed(() => !['idle', 'pending'].includes(sessionStatus.value))
const isAuthenticated = computed(() => session.value?.authenticated === true)
const displayName = computed(() =>
  session.value?.authenticated === true ? session.value.displayName : ''
)
const workspaceLink = computed(() =>
  session.value?.authenticated === true && session.value.role === 'admin' ? '/admin' : '/dashboard'
)
const workspaceLabel = computed(() =>
  session.value?.authenticated === true && session.value.role === 'admin' ? 'Open admin dashboard' : 'Open dashboard'
)

useSeoMeta({
  title: 'InsightFlow | Plain-language sales insights for small businesses',
  description: 'Upload your sales data and get plain-language recommendations about what is selling, what is not, and which days are worth your attention.',
  ogTitle: 'InsightFlow | Plain-language sales insights for small businesses',
  ogDescription: 'Upload your sales data and get plain-language recommendations about what is selling, what is not, and which days are worth your attention.',
  ogType: 'website'
})

const features = [
  {
    icon: 'i-lucide-upload',
    title: 'Upload in minutes',
    description: 'Bring a spreadsheet of sales with dates, items, quantities, and prices. No integrations to configure.'
  },
  {
    icon: 'i-lucide-chart-column',
    title: 'See it clearly',
    description: 'Revenue, top sellers, and weekday patterns appear as soon as your data is ready.'
  },
  {
    icon: 'i-lucide-lightbulb',
    title: 'Plain-language findings',
    description: 'Recommendations explain what happened and what you can do next, without analytics jargon.'
  },
  {
    icon: 'i-lucide-globe',
    title: 'Publish a finding',
    description: 'Share what you learned on a public page while keeping your real figures private by default.'
  }
]

const guestSteps = [
  { title: 'Create your account', description: 'Tell us a little about your business.' },
  { title: 'Get approved', description: 'A short review keeps the workspace trustworthy.' },
  { title: 'Upload and act', description: 'Add sales data and receive findings you can use today.' }
]

const ownerSteps = [
  { title: 'Review your dashboard', description: 'See revenue, top sellers, and weekday patterns in one place.' },
  { title: 'Choose your next action', description: 'Open recommendations written for the data you uploaded.' },
  { title: 'Share selectively', description: 'Publish a useful finding without exposing private sales totals.' }
]

const steps = computed(() => isAuthenticated.value ? ownerSteps : guestSteps)

const faqs = [
  {
    label: 'Who is InsightFlow for?',
    content: 'Small businesses that track their own sales and want to understand the numbers without hiring an analyst.'
  },
  {
    label: 'Why does a new account need approval?',
    content: 'A short admin review keeps the workspace limited to genuine businesses. You can sign in as soon as your account is approved.'
  },
  {
    label: 'What does the public insight feed show?',
    content: 'Businesses choose which findings to publish. The feed shows the change while hiding the underlying revenue figure by default.'
  },
  {
    label: 'Do I need spreadsheet skills?',
    content: 'No. If you can export what sold, when it sold, and for how much, InsightFlow does the rest.'
  }
]
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-default">
      <div class="absolute inset-y-0 right-0 hidden w-2/5 bg-primary/8 lg:block" />
      <div class="relative mx-auto grid min-h-[calc(100dvh-4.5rem)] w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
        <div class="max-w-xl">
          <template v-if="sessionReady">
            <p class="text-sm font-semibold text-primary-700 dark:text-primary-300">
              {{ isAuthenticated ? `Welcome back, ${displayName}` : 'Built for small business owners' }}
            </p>
            <h1 class="mt-5 text-3xl font-semibold tracking-tight">
              {{ isAuthenticated ? 'Pick up where your business left off.' : 'Know what is happening in your business.' }}
            </h1>
            <p class="mt-6 max-w-lg text-lg leading-8 text-muted">
              {{ isAuthenticated ? 'Open your dashboard for current patterns, or see what other businesses are learning.' : 'Upload sales data and get clear findings you can act on today.' }}
            </p>
            <div class="mt-8">
              <UButton v-if="isAuthenticated" :to="workspaceLink" size="lg" class="text-primary-950" trailing-icon="i-lucide-arrow-right">
                {{ workspaceLabel }}
              </UButton>
              <UButton v-else to="/login?mode=signup" size="lg" class="text-primary-950" trailing-icon="i-lucide-arrow-right">
                Get started free
              </UButton>
            </div>
          </template>
          <template v-else>
            <USkeleton class="h-5 w-48" />
            <USkeleton class="mt-5 h-10 w-3/4" />
            <USkeleton class="mt-6 h-6 w-full" />
            <USkeleton class="mt-8 h-11 w-36" />
          </template>
        </div>

        <div class="relative lg:pl-6">
          <div class="overflow-hidden rounded-2xl border border-default bg-default shadow-2xl shadow-primary/10">
            <div class="flex items-center justify-between border-b border-default px-5 py-4">
              <div class="flex items-center gap-3">
                <UiBrandMark compact />
                <div>
                  <p class="text-sm font-semibold">Sales overview</p>
                  <p class="text-xs text-muted">Latest uploaded period</p>
                </div>
              </div>
              <UBadge color="primary" variant="subtle">Live workspace</UBadge>
            </div>

            <div class="grid gap-4 bg-elevated/50 p-5 sm:grid-cols-2">
              <UiMetricCard label="Published insights" :value="String(homeStats.insightCount)" />
              <UiMetricCard label="Businesses learning" :value="String(homeStats.businessCount)" />

              <div class="rounded-xl border border-default bg-default p-5 sm:col-span-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-semibold">Latest finding</p>
                  <UIcon name="i-lucide-activity" class="size-5 ink-accent" />
                </div>
                <template v-if="homeStats.latestInsight">
                  <p class="mt-5 text-2xl font-semibold tracking-tight">
                    {{ homeStats.latestInsight.caption }}
                  </p>
                  <UiChangeIndicator
                    :value="homeStats.latestInsight.metricValue"
                    :label="homeStats.latestInsight.metricLabel"
                    class="mt-4"
                  />
                </template>
                <template v-else>
                  <p class="mt-5 text-lg font-semibold">Your first clear pattern will appear here.</p>
                  <p class="mt-2 text-sm text-muted">Upload a sales export to begin.</p>
                </template>
              </div>
            </div>
          </div>
          <div class="absolute -bottom-5 -right-5 -z-10 size-40 rounded-2xl bg-primary/20" />
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div class="max-w-2xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need, clearly arranged</h2>
        <p class="mt-4 text-lg leading-8 text-muted">InsightFlow reads your sales like a good manager and explains what deserves attention.</p>
      </div>

      <div class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-default bg-default sm:grid-cols-2 lg:grid-cols-[1.15fr_0.85fr]">
        <article
          v-for="(feature, index) in features"
          :key="feature.title"
          class="bg-default p-7 transition hover:bg-elevated/70"
          :class="index === 0 || index === 3 ? 'sm:min-h-64' : ''"
        >
          <div class="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary-700 dark:text-primary-300">
            <UIcon :name="feature.icon" class="size-5" />
          </div>
          <h3 class="mt-8 text-xl font-semibold">{{ feature.title }}</h3>
          <p class="mt-3 max-w-md text-sm leading-6 text-muted">{{ feature.description }}</p>
        </article>
      </div>
    </section>

    <section class="border-y border-default bg-neutral-950 text-white">
      <div class="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
        <div>
          <template v-if="sessionReady">
            <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">{{ isAuthenticated ? 'From data to action' : 'From account to action' }}</h2>
            <p class="mt-4 max-w-md text-neutral-400">{{ isAuthenticated ? 'Your workspace keeps the path from evidence to decision short.' : 'Three focused steps. Account review is the only wait.' }}</p>
          </template>
          <template v-else>
            <USkeleton class="h-10 w-3/4" />
            <USkeleton class="mt-4 h-5 w-full" />
          </template>
        </div>
        <ol v-if="sessionReady" class="divide-y divide-white/10 border-y border-white/10">
          <li v-for="(step, index) in steps" :key="step.title" class="grid grid-cols-[48px_1fr] gap-4 py-6">
            <span class="text-sm font-semibold text-primary">0{{ index + 1 }}</span>
            <div>
              <h3 class="font-semibold">{{ step.title }}</h3>
              <p class="mt-2 text-sm text-neutral-400">{{ step.description }}</p>
            </div>
          </li>
        </ol>
        <div v-else class="space-y-4">
          <USkeleton v-for="index in 3" :key="index" class="h-20 w-full" />
        </div>
      </div>
    </section>

    <section class="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
      <div>
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">See what other businesses are learning</h2>
        <p class="mt-4 max-w-xl text-lg leading-8 text-muted">Published findings show what changed while keeping private sales totals out of view.</p>
        <UButton to="/insights" class="mt-7" color="neutral" variant="outline" trailing-icon="i-lucide-arrow-right">
          Browse the insight feed
        </UButton>
      </div>
      <UCard class="border-l-4 border-l-primary">
        <template v-if="homeStats.latestInsight">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">{{ homeStats.latestInsight.displayName }} · {{ homeStats.latestInsight.businessType }}</p>
          <p class="mt-5 text-2xl font-semibold tracking-tight">{{ homeStats.latestInsight.caption }}</p>
          <UiChangeIndicator :value="homeStats.latestInsight.metricValue" :label="homeStats.latestInsight.metricLabel" class="mt-4" />
        </template>
        <template v-else>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Public insight feed</p>
          <p class="mt-5 text-2xl font-semibold tracking-tight">Published findings will appear here.</p>
          <p class="mt-3 text-sm text-muted">Actual business totals remain private by default.</p>
        </template>
      </UCard>
    </section>

    <section class="border-t border-default bg-elevated/40">
      <div class="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
        <h2 class="text-3xl font-semibold tracking-tight">Common questions</h2>
        <UAccordion :items="faqs" />
      </div>
    </section>

  </div>
</template>
