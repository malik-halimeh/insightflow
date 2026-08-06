<!--
  The landing page. Prerendered once at deploy time (see routeRules in
  nuxt.config.ts), so nothing here can depend on who is visiting — the header's
  "Sign in" / "Dashboard" swap happens client-side in app/layouts/landing.vue,
  never in this file.

  The insight-feed teaser card below is the one part of this page that shows
  real figures, so it is fetched client-side from /api/home-stats (which reads
  MongoDB directly) rather than baked in at prerender time. Everything else on
  the page is marketing copy and stays static on purpose — see the file header
  note above about why nothing else here can depend on live data.
-->

<script setup lang="ts">
import type { HomeStats } from '#shared/types/home'

definePageMeta({ layout: 'landing' })

// Fetched client-side (server: false) even though this page is prerendered —
// a prerendered page has no request-time server to run this on, and static
// marketing copy elsewhere on the page must not block on a database call.
const { data: homeStats } = await useFetch<HomeStats>('/api/home-stats', {
  server: false,
  default: (): HomeStats => ({ insightCount: 0, businessCount: 0, latestInsight: null })
})

useSeoMeta({
  title: 'InsightFlow — plain-language sales insights for small businesses',
  description: 'Upload your sales data and get plain-language recommendations about what is selling, what is not, and which days are worth your attention.',
  ogTitle: 'InsightFlow — plain-language sales insights for small businesses',
  ogDescription: 'Upload your sales data and get plain-language recommendations about what is selling, what is not, and which days are worth your attention.',
  ogType: 'website'
})

const features = [
  {
    icon: 'i-lucide-upload',
    title: 'Upload in minutes',
    description: 'Bring a spreadsheet of sales — dates, items, quantities, prices. No integrations to configure.'
  },
  {
    icon: 'i-lucide-chart-column',
    title: 'See it clearly',
    description: 'Revenue, top sellers and weekday patterns, laid out the moment your data is in.'
  },
  {
    icon: 'i-lucide-lightbulb',
    title: 'Plain-language findings',
    description: 'No jargon, no dashboards to interpret — recommendations written the way you would explain them to staff.'
  },
  {
    icon: 'i-lucide-calendar-days',
    title: 'Know your week',
    description: 'Which days run hot, which run quiet, and by how much — so staffing and stock match demand.'
  },
  {
    icon: 'i-lucide-globe',
    title: 'Publish a finding',
    description: 'Share what you learned on a public page, with your real figures hidden by default.'
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Reviewed accounts',
    description: 'Every new business account is checked by our team before it goes live, so the workspace stays trustworthy.'
  }
]

const steps = [
  {
    title: 'Create your account',
    description: 'Tell us a little about your business — its size, where it is, and roughly how many customers you see a month.'
  },
  {
    title: 'Get approved',
    description: 'A short review keeps the workspace to real businesses. Most accounts are checked quickly.'
  },
  {
    title: 'Upload and act',
    description: 'Add your sales data and see recommendations you can act on the same day.'
  }
]

const faqs = [
  {
    label: 'Who is InsightFlow for?',
    content: 'Small businesses that track their own sales — restaurants, cafés, shops and studios — and want to understand the numbers without hiring an analyst.'
  },
  {
    label: 'Why does a new account need approval?',
    content: 'A short admin review keeps the workspace limited to genuine businesses. Most accounts are reviewed quickly, and you will be able to sign in as soon as yours is approved.'
  },
  {
    label: 'What does the public insight feed show?',
    content: 'Findings that businesses choose to publish, shared as a change rather than a figure — you will see that Friday revenue is up 30%, never what Friday actually made.'
  },
  {
    label: 'Do I need any spreadsheet skills?',
    content: 'No. If you can export a list of what sold, on what date, for how much, InsightFlow does the rest.'
  }
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden border-b border-default">
      <div
        class="pointer-events-none absolute inset-x-0 -top-24 h-[420px] bg-[radial-gradient(ellipse_at_top,_var(--ui-primary)_0%,_transparent_60%)] opacity-[0.08]"
      />

      <div class="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <UBadge color="primary" variant="subtle" class="mb-6">
            Built for small business owners
          </UBadge>

          <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Know what is actually happening in your business.
          </h1>

          <p class="mt-6 max-w-lg text-lg text-muted">
            Upload your sales and InsightFlow turns them into plain-language
            findings you can act on today — what is selling, what is not, and
            which days are worth your attention.
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <UButton to="/login?mode=signup" size="lg" trailing-icon="i-lucide-arrow-right">
              Get started free
            </UButton>
            <UButton to="/insights" size="lg" color="neutral" variant="subtle">
              Read the insight feed
            </UButton>
          </div>

          <p class="mt-6 text-sm text-muted">
            Free to sign up. New accounts are reviewed before they go live.
          </p>
        </div>

        <!-- Illustrative preview. Numbers here are examples for layout only, never live figures. -->
        <div class="relative">
          <UCard class="shadow-lg">
            <template #header>
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold">
                  Dashboard preview
                </p>
                <UBadge color="neutral" variant="subtle" size="sm">
                  Example
                </UBadge>
              </div>
            </template>

            <div class="grid grid-cols-2 gap-4">
              <UiMetricCard label="Revenue" value="£12,480" :change="18.4" change-label="vs last week" />
              <UiMetricCard label="Units sold" value="2,140" />
            </div>

            <div class="mt-4 rounded-md border border-default p-4">
              <p class="text-xs text-muted">
                Busiest day
              </p>
              <p class="mt-1 text-lg font-semibold">
                Saturdays are 32% busier than Tuesdays here.
              </p>
            </div>

            <div class="mt-4 flex items-center gap-2 rounded-md border border-default p-4">
              <UIcon name="i-lucide-lightbulb" class="size-5 shrink-0 text-primary" />
              <p class="text-sm text-muted">
                "House Fries outsell every main course, week after week."
              </p>
            </div>
          </UCard>
        </div>
      </div>
    </section>

    <!-- Feature grid -->
    <section class="mx-auto w-full max-w-6xl px-4 py-20">
      <div class="max-w-2xl">
        <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Everything you need, nothing you have to learn
        </h2>
        <p class="mt-3 text-lg text-muted">
          InsightFlow reads your sales the way a good manager would — and says
          what it finds in plain sentences.
        </p>
      </div>

      <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <UCard v-for="feature in features" :key="feature.title">
          <div class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <UIcon :name="feature.icon" class="size-5" />
          </div>
          <p class="mt-4 font-semibold">
            {{ feature.title }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ feature.description }}
          </p>
        </UCard>
      </div>
    </section>

    <!-- How it works -->
    <section class="border-y border-default bg-elevated/50">
      <div class="mx-auto w-full max-w-6xl px-4 py-20">
        <div class="max-w-2xl">
          <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            From sign-up to your first finding
          </h2>
          <p class="mt-3 text-lg text-muted">
            Three steps, and the account review is the only wait.
          </p>
        </div>

        <ol class="mt-12 grid gap-8 sm:grid-cols-3">
          <li v-for="(step, index) in steps" :key="step.title">
            <div class="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-inverted">
              {{ index + 1 }}
            </div>
            <p class="mt-4 font-semibold">
              {{ step.title }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ step.description }}
            </p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Insight feed teaser -->
    <section class="mx-auto w-full max-w-6xl px-4 py-20">
      <div class="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <UBadge color="neutral" variant="subtle" class="mb-4">
            No account required
          </UBadge>
          <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            See what other businesses are learning
          </h2>
          <p class="mt-4 text-lg text-muted">
            Business owners publish findings to a public feed — shared as a
            change, never a figure. Read it any time, no sign-up needed.
          </p>
          <p v-if="homeStats.insightCount > 0" class="mt-2 text-sm text-muted">
            {{ homeStats.insightCount }} {{ homeStats.insightCount === 1 ? 'insight' : 'insights' }} published
            by {{ homeStats.businessCount }} {{ homeStats.businessCount === 1 ? 'business' : 'businesses' }} so far.
          </p>
          <UButton to="/insights" class="mt-6" color="neutral" variant="subtle" trailing-icon="i-lucide-arrow-right">
            Browse the insight feed
          </UButton>
        </div>

        <UCard v-if="homeStats.latestInsight">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-store" class="size-5 text-muted" />
            <p class="text-sm font-semibold">
              {{ homeStats.latestInsight.displayName }} · {{ homeStats.latestInsight.businessType }}
            </p>
          </div>
          <p class="mt-4 text-xl font-semibold tracking-tight">
            {{ homeStats.latestInsight.caption }}
          </p>
          <UiChangeIndicator
            :value="homeStats.latestInsight.metricValue"
            :label="homeStats.latestInsight.metricLabel"
            class="mt-3"
          />
        </UCard>

        <!-- Nothing published yet on a fresh database — an example layout, clearly marked as such. -->
        <UCard v-else>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-store" class="size-5 text-muted" />
            <p class="text-sm font-semibold">
              Example business · Restaurant
            </p>
          </div>
          <p class="mt-4 text-xl font-semibold tracking-tight">
            Friday and Saturday nights bring in far more than the rest of the
            week put together.
          </p>
          <UiChangeIndicator :value="30" label="Friday revenue against the weekly average" class="mt-3" />
          <UBadge color="neutral" variant="subtle" size="sm" class="mt-3">
            Example — no insights published yet
          </UBadge>
        </UCard>
      </div>
    </section>

    <!-- FAQ -->
    <section class="border-t border-default">
      <div class="mx-auto w-full max-w-3xl px-4 py-20">
        <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
          Common questions
        </h2>

        <UAccordion class="mt-8" :items="faqs" />
      </div>
    </section>

    <!-- Final CTA -->
    <section class="border-t border-default bg-elevated/50">
      <div class="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight">
            See your business in plain language.
          </h2>
          <p class="mt-2 text-muted">
            Free to sign up. Your first findings are minutes after your data is in.
          </p>
        </div>
        <UButton to="/login?mode=signup" size="lg" trailing-icon="i-lucide-arrow-right">
          Create your account
        </UButton>
      </div>
    </section>
  </div>
</template>
