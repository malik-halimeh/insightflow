<!--
  The landing page. Prerendered once at deploy time (see routeRules in
  nuxt.config.ts), so nothing here can depend on who is visiting. The header's
  "Sign in" / "Dashboard" swap happens client-side in app/layouts/landing.vue,
  never in this file.

  The insight-feed teaser is the one part of this page showing real figures, so it
  is fetched client-side from /api/home-stats rather than baked in at prerender
  time. Everything else is marketing copy and stays static on purpose.

  ON THE IMAGERY
  There is one labelled photograph slot in the capabilities grid and nothing else.
  Seeded placeholder services return an arbitrary photo rather than a relevant one,
  so the slot is left visibly empty instead. The hero shows the product through the
  product's own components, which is the honest way to show a tool like this.
-->

<script setup lang="ts">
import type { HomeStats } from '#shared/types/home'

definePageMeta({ layout: 'landing' })

// Fetched client-side (server: false) even though this page is prerendered:
// a prerendered page has no request-time server to run this on, and static
// marketing copy elsewhere must not block on a database call.
const { data: homeStats } = await useFetch<HomeStats>('/api/home-stats', {
  server: false,
  default: (): HomeStats => ({ insightCount: 0, businessCount: 0, latestInsight: null })
})

useSeoMeta({
  title: 'InsightFlow: plain-language sales insights for small businesses',
  description: 'Upload your sales data and get plain-language recommendations about what is selling, what is not, and which days are worth your attention.',
  ogTitle: 'InsightFlow: plain-language sales insights for small businesses',
  ogDescription: 'Upload your sales data and get plain-language recommendations about what is selling, what is not, and which days are worth your attention.',
  ogType: 'website'
})

/*
  Five capabilities, deliberately not five identical cards. The grid also holds a
  real published finding and a photograph slot, so it has a shape rather than a
  rhythm, and no cell is left empty.
*/
const capabilities = [
  {
    icon: 'i-lucide-upload',
    title: 'Upload in minutes',
    description: 'Bring a spreadsheet of sales: dates, items, quantities, prices. No integrations to configure.'
  },
  {
    icon: 'i-lucide-lightbulb',
    title: 'Plain-language findings',
    description: 'No jargon and no dashboard to interpret. Recommendations written the way you would explain them to staff.'
  },
  {
    icon: 'i-lucide-calendar-days',
    title: 'Know your week',
    description: 'Which days run hot, which run quiet, and by how much, so staffing and stock match demand.'
  },
  {
    icon: 'i-lucide-globe',
    title: 'Publish a finding',
    description: 'Share what you learned on a public page, with your real figures hidden by default.'
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Reviewed accounts',
    description: 'Every new business account is checked before it goes live, so the workspace stays trustworthy.'
  }
]

const steps = [
  {
    title: 'Create your account',
    description: 'Tell us a little about your business: its size, where it is, and roughly how many customers you see a month.'
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
    content: 'Small businesses that track their own sales, including restaurants, cafés, shops and studios, and want to understand the numbers without hiring an analyst.'
  },
  {
    label: 'Why does a new account need approval?',
    content: 'A short admin review keeps the workspace limited to genuine businesses. Most accounts are reviewed quickly, and you will be able to sign in as soon as yours is approved.'
  },
  {
    label: 'What does the public insight feed show?',
    content: 'Findings that businesses choose to publish, shared as a change rather than a figure. You will see that Friday revenue is up 30%, never what Friday actually made.'
  },
  {
    label: 'Do I need any spreadsheet skills?',
    content: 'No. If you can export a list of what sold, on what date, for how much, InsightFlow does the rest.'
  }
]
</script>

<template>
  <div>
    <!-- Hero: asymmetric split, four text elements, the product on the right. -->
    <section class="relative overflow-hidden border-b border-default">
      <div
        class="pointer-events-none absolute inset-x-0 -top-24 h-[420px] bg-[radial-gradient(ellipse_at_top,_var(--ui-primary)_0%,_transparent_60%)] opacity-[0.06]"
      />

      <div class="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pb-20 pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-24">
        <div>
          <UBadge color="primary" variant="subtle" class="mb-6">
            Built for small business owners
          </UBadge>

          <h1 class="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Know what is actually happening in your business.
          </h1>

          <p class="mt-6 max-w-md text-lg leading-relaxed text-muted">
            Upload your sales. InsightFlow tells you what is selling, what is not,
            and which days deserve your attention.
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <UButton to="/login?mode=signup" size="lg" trailing-icon="i-lucide-arrow-right">
              Get started
            </UButton>
            <UButton to="/insights" size="lg" color="neutral" variant="subtle">
              Read the insight feed
            </UButton>
          </div>
        </div>

        <!--
          The product, shown with the product's own components.

          UiMetricCard and UiChangeIndicator are the same components the workspace
          renders, given example figures. Not a screenshot, and deliberately not a
          drawing of a screenshot: a hero built out of styled divs pretending to be
          an interface is the most obvious tell there is, and this page would be
          claiming a product that does not look like this one.
        -->
        <div class="relative">
          <div class="rounded-[calc(var(--ui-radius)*2)] border border-default bg-elevated/60 p-5 sm:p-7">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold">
                Your week, once your sales are in
              </p>
              <UBadge color="neutral" variant="subtle" size="sm">
                Example
              </UBadge>
            </div>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <UiMetricCard label="Revenue" value="£12,480" :change="18.4" change-label="against last week" />
              <UiMetricCard label="Units sold" value="2,140" />
            </div>

            <div class="mt-4 rounded-[calc(var(--ui-radius)*1.5)] border border-default bg-default p-5">
              <p class="text-lg font-semibold leading-snug">
                Saturdays are 32% busier than Tuesdays here.
              </p>
              <p class="mt-2 text-sm text-muted">
                House Fries outsell every main course, week after week.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Proof strip: the reassurance that used to sit under the hero CTAs. -->
    <section class="border-b border-default bg-elevated/40">
      <div class="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-10 gap-y-3 px-4 py-5 text-sm text-muted">
        <span class="inline-flex items-center gap-2">
          <UIcon name="i-lucide-check" class="size-4 text-primary" />
          Free to sign up
        </span>
        <span class="inline-flex items-center gap-2">
          <UIcon name="i-lucide-check" class="size-4 text-primary" />
          Every account reviewed before it goes live
        </span>
        <span v-if="homeStats.insightCount > 0" class="inline-flex items-center gap-2">
          <UIcon name="i-lucide-check" class="size-4 text-primary" />
          {{ homeStats.insightCount }} findings published by
          {{ homeStats.businessCount }} {{ homeStats.businessCount === 1 ? 'business' : 'businesses' }}
        </span>
      </div>
    </section>

    <!-- Capabilities: asymmetric bento, five cells, two of them visual. -->
    <section class="mx-auto w-full max-w-6xl px-4 py-24">
      <div class="max-w-xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need, nothing you have to learn
        </h2>
        <p class="mt-4 text-lg leading-relaxed text-muted">
          InsightFlow reads your sales the way a good manager would, then says what
          it found in plain sentences.
        </p>
      </div>

      <div class="rise-in mt-14 grid gap-4 md:grid-cols-6">
        <!--
          Wide cell: a real published finding, in the same shape the public feed
          renders it. This is the product's actual output, not a description of it.
        -->
        <UCard class="md:col-span-4">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-quote" class="size-5 text-muted" />
            <p class="text-sm text-muted">
              What a finding actually reads like
            </p>
          </div>
          <p class="mt-4 text-2xl font-semibold leading-snug tracking-tight">
            Tuesday evenings are your quietest shift, by some distance.
          </p>
          <UiChangeIndicator :value="-18.5" label="Tuesday revenue against the weekly average" class="mt-4" />
          <p class="mt-4 text-sm leading-relaxed text-muted">
            Every finding arrives with the number behind it and a suggested action,
            so you can disagree with it.
          </p>
        </UCard>

        <!--
          TODO: photograph of a real customer business, portrait, roughly 900x1400.
          Left as a labelled slot rather than filled with stock: seeded placeholder
          services return an arbitrary image, not a relevant one, and a lake on a
          sales-analytics page is worse than an honest gap.
        -->
        <div class="flex min-h-64 flex-col justify-end rounded-[calc(var(--ui-radius)*1.5)] border border-dashed border-default bg-elevated/40 p-6 md:col-span-2 md:row-span-2">
          <UIcon name="i-lucide-image" class="size-6 text-dimmed" />
          <p class="mt-3 text-sm font-medium">
            Customer photograph
          </p>
          <p class="mt-1 text-sm text-muted">
            A real business, photographed at work. Replaces this slot before launch.
          </p>
        </div>

        <UCard v-for="capability in capabilities.slice(0, 2)" :key="capability.title" class="md:col-span-2">
          <div class="flex size-10 items-center justify-center rounded-[calc(var(--ui-radius)*0.5)] bg-primary/10 text-primary">
            <UIcon :name="capability.icon" class="size-5" />
          </div>
          <p class="mt-4 font-semibold">
            {{ capability.title }}
          </p>
          <p class="mt-1 text-sm leading-relaxed text-muted">
            {{ capability.description }}
          </p>
        </UCard>

        <UCard v-for="capability in capabilities.slice(2)" :key="capability.title" class="md:col-span-2">
          <div class="flex size-10 items-center justify-center rounded-[calc(var(--ui-radius)*0.5)] bg-primary/10 text-primary">
            <UIcon :name="capability.icon" class="size-5" />
          </div>
          <p class="mt-4 font-semibold">
            {{ capability.title }}
          </p>
          <p class="mt-1 text-sm leading-relaxed text-muted">
            {{ capability.description }}
          </p>
        </UCard>
      </div>
    </section>

    <!-- How it works: a timeline, not three cards. -->
    <section class="border-y border-default bg-elevated/40">
      <div class="mx-auto w-full max-w-6xl px-4 py-24">
        <div class="max-w-xl">
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            From sign-up to your first finding
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-muted">
            Three steps, and the account review is the only wait.
          </p>
        </div>

        <ol class="rise-in mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          <li v-for="(step, index) in steps" :key="step.title" class="relative sm:pt-8">
            <span
              class="absolute inset-x-0 top-4 hidden h-px bg-default sm:block"
              aria-hidden="true"
            />
            <span
              class="relative z-10 inline-flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-inverted sm:absolute sm:left-0 sm:top-0"
            >
              {{ index + 1 }}
            </span>
            <p class="mt-4 font-semibold sm:mt-0">
              {{ step.title }}
            </p>
            <p class="mt-1 text-sm leading-relaxed text-muted">
              {{ step.description }}
            </p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Insight feed teaser -->
    <section class="mx-auto w-full max-w-6xl px-4 py-24">
      <div class="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <UBadge color="neutral" variant="subtle" class="mb-4">
            No account required
          </UBadge>
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            See what other businesses are learning
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-muted">
            Owners publish findings to a public feed, shared as a change rather
            than a figure. Read it any time, no sign-up needed.
          </p>
          <UButton to="/insights" class="mt-6" color="neutral" variant="subtle" trailing-icon="i-lucide-arrow-right">
            Read the insight feed
          </UButton>
        </div>

        <UCard v-if="homeStats.latestInsight">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-store" class="size-5 text-muted" />
            <p class="text-sm font-semibold">
              {{ homeStats.latestInsight.displayName }}
            </p>
          </div>
          <p class="mt-4 text-xl font-semibold leading-snug tracking-tight">
            {{ homeStats.latestInsight.caption }}
          </p>
          <UiChangeIndicator
            :value="homeStats.latestInsight.metricValue"
            :label="homeStats.latestInsight.metricLabel"
            class="mt-3"
          />
        </UCard>

        <!-- Nothing published yet on a fresh database. An example, marked as one. -->
        <UCard v-else>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-store" class="size-5 text-muted" />
            <p class="text-sm font-semibold">
              Example business
            </p>
          </div>
          <p class="mt-4 text-xl font-semibold leading-snug tracking-tight">
            Friday and Saturday nights bring in far more than the rest of the week
            put together.
          </p>
          <UiChangeIndicator :value="30" label="Friday revenue against the weekly average" class="mt-3" />
          <UBadge color="neutral" variant="subtle" size="sm" class="mt-3">
            Example, nothing published yet
          </UBadge>
        </UCard>
      </div>
    </section>

    <!-- FAQ -->
    <section class="border-t border-default">
      <div class="mx-auto w-full max-w-3xl px-4 py-24">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Common questions
        </h2>

        <UAccordion class="mt-8" :items="faqs" />
      </div>
    </section>

    <!-- Final CTA -->
    <section class="border-t border-default bg-elevated/40">
      <div class="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-3xl font-semibold tracking-tight">
            See your business in plain language.
          </h2>
          <p class="mt-2 text-muted">
            Free to sign up. Your first findings arrive minutes after your data is in.
          </p>
        </div>
        <UButton to="/login?mode=signup" size="lg" trailing-icon="i-lucide-arrow-right">
          Get started
        </UButton>
      </div>
    </section>
  </div>
</template>
