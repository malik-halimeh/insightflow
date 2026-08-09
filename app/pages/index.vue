<script setup lang="ts">
import type { HomeStats } from '#shared/types/home'

definePageMeta({ layout: 'landing' })

const { data: homeStats, status: homeStatsStatus } = await useFetch<HomeStats>('/api/home-stats', {
  server: false,
  default: (): HomeStats => ({
    insightCount: 0,
    businessCount: 0,
    latestInsight: null,
    recentInsights: [],
    outcomeStory: null
  })
})
const { data: session, status: sessionStatus } = await useFetch('/api/auth/session', { server: false })

const sessionReady = computed(() => !['idle', 'pending'].includes(sessionStatus.value))
const homeStatsLoading = computed(() => ['idle', 'pending'].includes(homeStatsStatus.value))
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

const productJourney = [
  {
    icon: 'i-lucide-upload',
    title: 'Upload',
    description: 'Add a sales export and check every row before it enters your workspace.'
  },
  {
    icon: 'i-lucide-chart-column',
    title: 'Understand',
    description: 'See revenue, top sellers, and weekday patterns in one clear dashboard.'
  },
  {
    icon: 'i-lucide-lightbulb',
    title: 'Act',
    description: 'Choose a plain-language recommendation and record the action you took.'
  },
  {
    icon: 'i-lucide-gauge',
    title: 'Measure',
    description: 'Compare the observed result after the action without claiming it proves causation.'
  },
  {
    icon: 'i-lucide-globe',
    title: 'Publish',
    description: 'Optionally share a sanitized finding while private business totals stay hidden.'
  }
]

const outcomeStatusLabels = {
  improved: 'Improved',
  no_clear_effect: 'No clear effect',
  worsened: 'Worsened'
} as const

const workspaceComparison = [
  {
    label: 'Audience',
    workspace: 'Only the signed-in business owner',
    publicFeed: 'Anyone browsing the public insight feed'
  },
  {
    label: 'Values',
    workspace: 'Private sales totals and operational detail',
    publicFeed: 'Sanitized percentage changes and plain-language context'
  },
  {
    label: 'Actions',
    workspace: 'Upload data, analyze patterns, and decide what to do next',
    publicFeed: 'Browse useful patterns and learn from other businesses'
  },
  {
    label: 'Sharing',
    workspace: 'The owner chooses whether a finding is published',
    publicFeed: 'Only the approved public finding is discoverable'
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
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">From sales export to measured outcome</h2>
        <p class="mt-4 text-lg leading-8 text-muted">A focused sequence turns a spreadsheet into a decision you can review and learn from.</p>
      </div>

      <ol class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-default bg-default sm:grid-cols-2 lg:grid-cols-5">
        <li
          v-for="(feature, index) in productJourney"
          :key="feature.title"
          class="bg-default p-6 transition hover:bg-elevated/70"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary-700 dark:text-primary-300">
              <UIcon :name="feature.icon" class="size-5" />
            </div>
            <span class="text-xs font-semibold text-muted">0{{ index + 1 }}</span>
          </div>
          <h3 class="mt-8 text-lg font-semibold">{{ feature.title }}</h3>
          <p class="mt-3 text-sm leading-6 text-muted">{{ feature.description }}</p>
        </li>
      </ol>
    </section>

    <section class="border-y border-default bg-elevated/40">
      <div class="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div class="max-w-2xl">
          <p class="text-sm font-semibold text-primary-700 dark:text-primary-300">Private by design</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">One finding, two deliberate views</h2>
          <p class="mt-4 text-lg leading-8 text-muted">
            Your workspace keeps the full business picture private. Publishing creates a separate public view with only the relative change and context you choose to share.
          </p>
          <p class="mt-3 text-sm text-muted">Bella Pizza is a fictional business used for presentation examples.</p>
        </div>

        <div class="mt-12 grid gap-8 lg:grid-cols-2">
          <figure class="overflow-hidden rounded-2xl border border-default bg-default">
            <img
              src="/images/product/dashboard-overview.png"
              alt="InsightFlow private dashboard showing revenue totals, sales metrics, and weekday patterns"
              class="aspect-[36/25] w-full object-cover object-top"
            >
            <figcaption class="border-t border-default p-6">
              <p class="font-semibold">Private owner workspace</p>
              <p class="mt-2 text-sm leading-6 text-muted">Absolute sales values stay inside the authenticated workspace where the owner can analyze and act on them.</p>
            </figcaption>
          </figure>

          <figure class="overflow-hidden rounded-2xl border border-default bg-default">
            <img
              src="/images/product/public-insight.png"
              alt="InsightFlow public insight showing a percentage change without absolute sales totals"
              class="aspect-[36/25] w-full object-cover object-top"
            >
            <figcaption class="border-t border-default p-6">
              <p class="font-semibold">Public insight feed</p>
              <p class="mt-2 text-sm leading-6 text-muted">Public pages show a sanitized percentage and plain-language caption, never the private totals behind the finding.</p>
            </figcaption>
          </figure>
        </div>

        <dl class="mt-8 overflow-hidden rounded-2xl border border-default bg-default">
          <div class="hidden grid-cols-[0.35fr_1fr_1fr] gap-6 border-b border-default bg-elevated/60 px-6 py-4 text-sm font-semibold lg:grid">
            <span>Difference</span>
            <span>Owner workspace</span>
            <span>Public insight</span>
          </div>
          <div
            v-for="item in workspaceComparison"
            :key="item.label"
            class="grid gap-4 border-b border-default px-6 py-5 last:border-b-0 lg:grid-cols-[0.35fr_1fr_1fr] lg:gap-6"
          >
            <dt class="font-semibold">{{ item.label }}</dt>
            <dd class="text-sm leading-6 text-muted">
              <span class="mb-1 block font-medium text-highlighted lg:hidden">Owner workspace</span>
              {{ item.workspace }}
            </dd>
            <dd class="text-sm leading-6 text-muted">
              <span class="mb-1 block font-medium text-highlighted lg:hidden">Public insight</span>
              {{ item.publicFeed }}
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="border-b border-default bg-default">
      <div class="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
        <div>
          <template v-if="sessionReady">
            <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">{{ isAuthenticated ? 'From data to action' : 'From account to action' }}</h2>
            <p class="mt-4 max-w-md text-muted">{{ isAuthenticated ? 'Your workspace keeps the path from evidence to decision short.' : 'Three focused steps. Account review is the only wait.' }}</p>
          </template>
          <template v-else>
            <USkeleton class="h-10 w-3/4" />
            <USkeleton class="mt-4 h-5 w-full" />
          </template>
        </div>
        <ol v-if="sessionReady" class="divide-y divide-default border-y border-default">
          <li v-for="(step, index) in steps" :key="step.title" class="grid grid-cols-[48px_1fr] gap-4 py-6">
            <span class="text-sm font-semibold text-primary">0{{ index + 1 }}</span>
            <div>
              <h3 class="font-semibold">{{ step.title }}</h3>
              <p class="mt-2 text-sm text-muted">{{ step.description }}</p>
            </div>
          </li>
        </ol>
        <div v-else class="space-y-4">
          <USkeleton v-for="index in 3" :key="index" class="h-20 w-full" />
        </div>
      </div>
    </section>

    <section class="bg-elevated/40">
      <div class="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:px-8">
        <div>
          <p class="text-sm font-semibold text-primary-700 dark:text-primary-300">Close the loop</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">See what followed the action</h2>
          <p class="mt-4 max-w-xl text-lg leading-8 text-muted">Outcome tracking compares the next sales period with the earlier one. It records an observed result, not proof that the recommendation caused it.</p>
        </div>

        <USkeleton v-if="homeStatsLoading" class="h-64 w-full rounded-2xl" />
        <UCard v-else-if="homeStats.outcomeStory" class="border-l-4 border-l-primary">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Published outcome story</p>
            <UBadge color="neutral" variant="subtle">{{ outcomeStatusLabels[homeStats.outcomeStory.outcomeStatus] }}</UBadge>
          </div>
          <p class="mt-5 text-2xl font-semibold tracking-tight">{{ homeStats.outcomeStory.caption }}</p>
          <div class="mt-5 grid gap-5 sm:grid-cols-2">
            <UiChangeIndicator :value="homeStats.outcomeStory.metricValue" :label="homeStats.outcomeStory.metricLabel" />
            <UiChangeIndicator
              v-if="homeStats.outcomeStory.observedChangePercent !== null"
              :value="homeStats.outcomeStory.observedChangePercent"
              label="Observed change after the action"
            />
            <p v-else class="text-sm leading-6 text-muted">The earlier value was zero, so an observed percentage change is not available.</p>
          </div>
        </UCard>
        <UCard v-else>
          <p class="font-semibold">No completed published outcome yet</p>
          <p class="mt-2 text-sm leading-6 text-muted">A story will appear here after a published recommendation has a completed measurement.</p>
        </UCard>
      </div>
    </section>

    <section class="border-t border-default bg-default">
      <div class="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div class="max-w-2xl">
            <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">Recent public insights</h2>
            <p class="mt-4 text-lg leading-8 text-muted">Published findings show relative changes and context while keeping private sales totals out of view.</p>
          </div>
          <UButton to="/insights" color="neutral" variant="outline" trailing-icon="i-lucide-arrow-right">
            Browse the insight feed
          </UButton>
        </div>

        <div v-if="homeStatsLoading" class="mt-10 grid gap-6 md:grid-cols-3">
          <USkeleton v-for="index in 3" :key="index" class="h-64 w-full rounded-2xl" />
        </div>
        <div v-else-if="homeStats.recentInsights.length > 0" class="mt-10 grid gap-6 md:grid-cols-3">
          <UCard v-for="insight in homeStats.recentInsights" :key="insight.slug">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">{{ insight.displayName }} · {{ insight.businessType }}</p>
            <p class="mt-5 text-lg font-semibold leading-7">{{ insight.caption }}</p>
            <UiChangeIndicator :value="insight.metricValue" :label="insight.metricLabel" class="mt-4" />
            <UButton :to="`/insights/${insight.slug}`" class="mt-6" color="neutral" variant="link" trailing-icon="i-lucide-arrow-right">
              Read insight
            </UButton>
          </UCard>
        </div>
        <UCard v-else class="mt-10">
          <p class="font-semibold">No public insights yet</p>
          <p class="mt-2 text-sm leading-6 text-muted">Published findings will appear here without exposing private business totals.</p>
        </UCard>
      </div>
    </section>

    <section class="border-t border-default bg-elevated/40">
      <div class="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
        <h2 class="text-3xl font-semibold tracking-tight">Common questions</h2>
        <UAccordion :items="faqs" />
      </div>
    </section>

  </div>
</template>
