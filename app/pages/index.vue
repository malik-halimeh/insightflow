<!--
  The landing page. Prerendered once at deploy time (see routeRules in
  nuxt.config.ts), so nothing here can depend on who is visiting. The header's
  "Sign in" / "Dashboard" swap happens client-side in app/layouts/landing.vue,
  never in this file.

  The statistics band and the feed teaser are the only parts showing real figures,
  so they are fetched client-side from /api/home-stats rather than baked in at
  prerender time. Everything else is marketing copy and stays static on purpose.

  ON THE IMAGERY
  There are no photographs, and that is a decision rather than a gap. This is a
  tool for reading figures, so its own output is the only honest thing to show:
  the hero, the industry tiles and the capability grid all render real product
  components with example data, clearly labelled as examples. A stock photograph
  of a smiling barista would say less about the product than one bar chart does.
-->

<script setup lang="ts">
import { formatPercentChange } from '#shared/format'
import type { HomeStats } from '#shared/types/home'

definePageMeta({ layout: 'landing' })

// Fetched client-side (server: false) even though this page is prerendered:
// a prerendered page has no request-time server to run this on, and static
// marketing copy elsewhere must not block on a database call.
const { data: homeStats, status: statsStatus } = await useFetch<HomeStats>('/api/home-stats', {
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
  The example week in the hero panel. Percentages of the busiest day, so the bars
  are drawn from the same shape of data the dashboard's real weekday chart uses.
*/
const exampleWeek = [
  { day: 'Mon', share: 44 },
  { day: 'Tue', share: 31 },
  { day: 'Wed', share: 49 },
  { day: 'Thu', share: 62 },
  { day: 'Fri', share: 88 },
  { day: 'Sat', share: 100 },
  { day: 'Sun', share: 57 }
]

/*
  Four trades, because "small business" on its own tells a café owner nothing.
  Each one leads with the question that trade actually asks, and the figures are
  examples, which the section says out loud rather than leaving to be assumed.
*/
const trades = [
  {
    icon: 'i-lucide-coffee',
    name: 'Cafés and restaurants',
    question: 'Which shifts are worth staffing?',
    value: 32.4,
    metricLabel: 'Saturday against an average day',
    detail: 'Covers, spend per head and the quiet hour you are still paying three people to work.',
    span: 'md:col-span-7',
    featured: true
  },
  {
    icon: 'i-lucide-shopping-bag',
    name: 'Shops and retail',
    question: 'What is sitting on the shelf?',
    value: -41,
    metricLabel: 'Slowest lines against last month',
    detail: 'The stock that has stopped moving, named, before it becomes a markdown.',
    span: 'md:col-span-5',
    featured: false
  },
  {
    icon: 'i-lucide-scissors',
    name: 'Salons and studios',
    question: 'When do bookings actually land?',
    value: 58.7,
    metricLabel: 'Late afternoon against the morning',
    detail: 'The hours worth opening for, and the ones worth moving your prices on.',
    span: 'md:col-span-5',
    featured: false
  },
  {
    icon: 'i-lucide-store',
    name: 'Stalls and pop-ups',
    question: 'Which pitch earns its fee?',
    value: 22.9,
    metricLabel: 'Saturday market against Sunday',
    detail: 'Takings per trading day, so the next season is booked on evidence.',
    span: 'md:col-span-7',
    featured: false
  }
]

const capabilities = [
  {
    icon: 'i-lucide-upload',
    title: 'Upload in minutes',
    description: 'Bring a spreadsheet of sales. No integrations, no setup call, no consultant.'
  },
  {
    icon: 'i-lucide-lightbulb',
    title: 'Plain-language findings',
    description: 'Recommendations written the way you would explain them to your staff.'
  },
  {
    icon: 'i-lucide-globe',
    title: 'Publish a finding',
    description: 'Share what you learned on a public page, with your real takings hidden.'
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Reviewed accounts',
    description: 'Every business account is checked before it goes live.'
  }
]

/* The four columns the importer actually requires. See server/utils/csv.ts. */
const fileColumns = [
  { name: 'date', example: '2026-03-14' },
  { name: 'item', example: 'House Fries' },
  { name: 'quantity', example: '18' },
  { name: 'price', example: '4.50' }
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
    /*
      This claim is load-bearing, so it is worth saying what makes it true. Every
      data set carries an `ownerId` and every private query filters on it through
      server/utils/ownership.ts. Asking for another account's data set answers 404.
      If that ever stops being true, this answer has to change with it.
    */
    label: 'Who can see my sales data?',
    content: 'Only you. Your uploads, your dashboard and your recommendations are scoped to your own account. Nothing leaves it unless you choose to publish a finding, and a published finding carries a percentage change and never your takings.'
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
    content: 'No. If you can export a list of what sold, on what date, for how much, InsightFlow does the rest. Column headings can be named however your till names them.'
  }
]
</script>

<template>
  <div>
    <!--
      Hero: asymmetric split. Four text elements on the left, the product itself
      on the right, built from the components the workspace renders rather than
      from styled boxes pretending to be a screenshot.
    -->
    <section class="relative overflow-hidden border-b border-default">
      <div
        class="pointer-events-none absolute inset-x-0 -top-32 h-[520px] bg-[radial-gradient(ellipse_at_top,_var(--ui-primary)_0%,_transparent_62%)] opacity-[0.08]"
      />

      <div class="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-20">
        <div>
          <UBadge color="primary" variant="subtle" class="mb-5">
            For cafés, shops, salons and stalls
          </UBadge>

          <!--
            Six words, because the column is about 540px wide and the display size
            is 60px. Anything past roughly 36 characters runs to a third line here,
            and a three-line hero headline is a font-size decision made badly, not
            a copy length worth defending.
          -->
          <h1 class="text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl lg:text-6xl">
            Know where your week makes money.
          </h1>

          <p class="mt-5 max-w-md text-lg leading-relaxed text-muted">
            Upload a spreadsheet of sales. InsightFlow returns plain-language
            findings you can act on the same afternoon.
          </p>

          <div class="mt-7 flex flex-wrap gap-3">
            <UButton to="/login?mode=signup" size="lg" trailing-icon="i-lucide-arrow-right">
              Get started
            </UButton>
            <UButton to="/insights" size="lg" color="neutral" variant="subtle">
              Read the insight feed
            </UButton>
          </div>
        </div>

        <!--
          The product, shown with the product's own components. UiMetricCard and
          UiChangeIndicator are the same components the dashboard renders, and the
          weekday bars are the same shape as DashboardDayOfWeekChart, given example
          figures. Deliberately not a drawing of a screenshot: a hero built out of
          styled divs pretending to be an interface is the most obvious tell there
          is, and this page would be claiming a product that does not look like
          this one.
        -->
        <div class="rounded-[calc(var(--ui-radius)*2)] border border-default bg-elevated/60 p-4 sm:p-6">
          <div class="flex items-center justify-between gap-4">
            <p class="text-sm font-semibold">
              Your week, once your sales are in
            </p>
            <UBadge color="neutral" variant="subtle" size="sm">
              Example
            </UBadge>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <UiMetricCard label="Revenue" value="£12,480.00" :change="18.4" change-label="against last week" />
            <UiMetricCard label="Units sold" value="2,140" :change="6.2" change-label="against last week" />
          </div>

          <div class="mt-3 rounded-[calc(var(--ui-radius)*1.5)] border border-default bg-default p-4 sm:p-5">
            <p class="text-xs text-muted">
              Revenue by day of week
            </p>

            <div class="mt-3 space-y-2">
              <div v-for="day in exampleWeek" :key="day.day" class="flex items-center gap-3">
                <span class="w-8 shrink-0 text-xs text-muted">{{ day.day }}</span>
                <div class="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-elevated">
                  <div
                    class="bar-grow h-full rounded-full"
                    :class="day.share === 100 ? 'bg-primary' : 'bg-primary/45'"
                    :style="{ width: `${day.share}%` }"
                  />
                </div>
              </div>
            </div>

            <div class="mt-4 border-t border-default pt-4">
              <p class="text-base font-semibold leading-snug">
                Saturdays take 32% more than an average day here.
              </p>
              <UiChangeIndicator :value="32.4" label="Saturday against the weekly average" class="mt-2" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!--
      Statistics band. Two live figures read from the database and two facts about
      the product that do not change. The live pair carries a loading state rather
      than flashing a zero, because a prerendered page fetches these in the browser.
    -->
    <section class="surface-accent border-b">
      <div class="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-8 gap-y-8 px-4 py-10 lg:grid-cols-4">
        <div>
          <USkeleton v-if="statsStatus === 'pending'" class="h-9 w-16" />
          <p v-else class="figure text-4xl ink-accent">
            {{ homeStats.insightCount }}
          </p>
          <p class="mt-2 text-sm text-muted">
            findings published so far
          </p>
        </div>

        <div>
          <USkeleton v-if="statsStatus === 'pending'" class="h-9 w-16" />
          <p v-else class="figure text-4xl ink-accent">
            {{ homeStats.businessCount }}
          </p>
          <p class="mt-2 text-sm text-muted">
            {{ homeStats.businessCount === 1 ? 'business sharing what it found' : 'businesses sharing what they found' }}
          </p>
        </div>

        <div>
          <p class="figure text-4xl ink-accent">
            4
          </p>
          <p class="mt-2 text-sm text-muted">
            columns is the whole file format
          </p>
        </div>

        <div>
          <p class="figure text-4xl ink-accent">
            £0
          </p>
          <p class="mt-2 text-sm text-muted">
            to sign up and upload
          </p>
        </div>
      </div>
    </section>

    <!--
      Who it is for. Four trades on an asymmetric 12-column grid, each led by the
      question that trade actually asks rather than by a feature name.
    -->
    <section class="mx-auto w-full max-w-6xl px-4 py-20">
      <div class="max-w-2xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Built for the businesses that do their own numbers
        </h2>
        <p class="mt-4 text-lg leading-relaxed text-muted">
          Whatever you sell, the questions are the same. These are the ones
          InsightFlow answers first, shown here with example figures.
        </p>
      </div>

      <div class="reveal mt-12 grid gap-4 md:grid-cols-12">
        <div
          v-for="trade in trades"
          :key="trade.name"
          class="lift rounded-[calc(var(--ui-radius)*1.5)] border p-6 sm:p-7"
          :class="trade.featured
            ? 'surface-accent'
            : 'border-default bg-default shadow-[0_1px_2px_-1px_rgb(41_37_36/0.08),0_2px_8px_-2px_rgb(41_37_36/0.06)]'"
        >
          <div
            class="flex size-10 items-center justify-center rounded-[calc(var(--ui-radius)*0.5)]"
            :class="trade.featured ? 'bg-primary on-accent' : 'surface-accent ink-accent'"
          >
            <UIcon :name="trade.icon" class="size-5" />
          </div>

          <p class="mt-5 text-sm font-medium text-muted">
            {{ trade.name }}
          </p>
          <h3 class="mt-1 text-xl font-semibold leading-snug sm:text-2xl">
            {{ trade.question }}
          </h3>

          <div class="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span
              class="figure text-3xl sm:text-4xl"
              :class="trade.value >= 0 ? 'text-success' : 'text-error'"
            >
              {{ formatPercentChange(trade.value) }}
            </span>
            <span class="text-sm text-muted">{{ trade.metricLabel }}</span>
          </div>

          <p class="mt-4 text-sm leading-relaxed text-muted">
            {{ trade.detail }}
          </p>
        </div>
      </div>
    </section>

    <!--
      Capabilities. Seven cells for seven things: a real finding, the file format,
      the weekday view, and four capabilities. No cell is filler and no two cells
      are the same size.
    -->
    <section class="border-y border-default bg-elevated/40">
      <div class="mx-auto w-full max-w-6xl px-4 py-20">
        <div class="max-w-2xl">
          <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need, nothing you have to learn
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-muted">
            InsightFlow reads your sales the way a good manager would, then says
            what it found in plain sentences.
          </p>
        </div>

        <div class="reveal mt-12 grid gap-4 md:grid-cols-6">
          <!-- What the product actually produces, in the shape the feed renders it. -->
          <UCard class="md:col-span-4">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-quote" class="size-5 text-muted" />
              <p class="text-sm text-muted">
                What a finding actually reads like
              </p>
            </div>
            <p class="mt-4 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
              Tuesday evenings are your quietest shift, by some distance.
            </p>
            <UiChangeIndicator :value="-18.5" label="Tuesday revenue against the weekly average" class="mt-4" />
            <p class="mt-4 text-sm leading-relaxed text-muted">
              Every finding arrives with the number behind it and a suggested
              action, so you can disagree with it.
            </p>
          </UCard>

          <!-- The file format, printed. Four rows, because four is the whole thing. -->
          <div class="flex flex-col rounded-[calc(var(--ui-radius)*1.5)] surface-accent border p-6 md:col-span-2 md:row-span-2">
            <p class="text-sm font-semibold">
              The whole file format
            </p>
            <p class="mt-1 text-sm text-muted">
              Four columns. Anything else in the file is ignored.
            </p>

            <ul class="mt-5 space-y-2">
              <li
                v-for="column in fileColumns"
                :key="column.name"
                class="flex items-baseline justify-between gap-3 rounded-[calc(var(--ui-radius)*0.5)] border border-default bg-default px-3 py-2"
              >
                <span class="text-sm font-medium">{{ column.name }}</span>
                <span class="text-sm text-muted">{{ column.example }}</span>
              </li>
            </ul>

            <p class="mt-5 text-sm leading-relaxed text-muted">
              Headings can be named however your till names them. Price, unit
              price and each all read as the same column.
            </p>
          </div>

          <!-- The weekday view, drawn rather than described. -->
          <UCard class="md:col-span-2">
            <div class="flex size-10 items-center justify-center rounded-[calc(var(--ui-radius)*0.5)] surface-accent ink-accent">
              <UIcon name="i-lucide-calendar-days" class="size-5" />
            </div>
            <p class="mt-4 font-semibold">
              Know your week
            </p>
            <p class="mt-1 text-sm leading-relaxed text-muted">
              Which days run hot and which run quiet, so staffing and stock match
              demand.
            </p>

            <div class="mt-4 flex h-16 items-end gap-1.5" aria-hidden="true">
              <div
                v-for="day in exampleWeek"
                :key="day.day"
                class="flex-1 rounded-t-sm"
                :class="day.share === 100 ? 'bg-primary' : 'bg-primary/30'"
                :style="{ height: `${day.share}%` }"
              />
            </div>
          </UCard>

          <UCard v-for="capability in capabilities" :key="capability.title" class="md:col-span-2">
            <div class="flex size-10 items-center justify-center rounded-[calc(var(--ui-radius)*0.5)] surface-accent ink-accent">
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
      </div>
    </section>

    <!-- How it works: a timeline, not three cards. -->
    <section class="mx-auto w-full max-w-6xl px-4 py-20">
      <div class="max-w-xl">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          From sign-up to your first finding
        </h2>
        <p class="mt-4 text-lg leading-relaxed text-muted">
          Three steps, and the account review is the only wait.
        </p>
      </div>

      <ol class="reveal mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
        <li v-for="(step, index) in steps" :key="step.title" class="relative sm:pt-8">
          <span
            class="absolute inset-x-0 top-4 hidden h-px bg-default sm:block"
            aria-hidden="true"
          />
          <span
            class="relative z-10 inline-flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold on-accent sm:absolute sm:left-0 sm:top-0"
          >
            {{ index + 1 }}
          </span>
          <p class="mt-4 text-lg font-semibold sm:mt-0">
            {{ step.title }}
          </p>
          <p class="mt-1 text-sm leading-relaxed text-muted">
            {{ step.description }}
          </p>
        </li>
      </ol>
    </section>

    <!-- Insight feed teaser -->
    <section class="border-t border-default bg-elevated/40">
      <div class="mx-auto w-full max-w-6xl px-4 py-20">
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

          <UCard v-if="homeStats.latestInsight" class="lift">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-store" class="size-5 text-muted" />
              <p class="text-sm font-semibold">
                {{ homeStats.latestInsight.displayName }}
              </p>
            </div>
            <p class="mt-4 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
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
            <p class="mt-4 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              Friday and Saturday nights bring in far more than the rest of the
              week put together.
            </p>
            <UiChangeIndicator :value="30" label="Friday revenue against the weekly average" class="mt-3" />
            <UBadge color="neutral" variant="subtle" size="sm" class="mt-3">
              Example, nothing published yet
            </UBadge>
          </UCard>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="border-t border-default">
      <div class="mx-auto w-full max-w-3xl px-4 py-20">
        <h2 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Common questions
        </h2>

        <UAccordion class="mt-8" :items="faqs" />
      </div>
    </section>

    <!--
      Final CTA on a full-bleed brand band. The one saturated block on the page,
      placed where the decision is made.

      This is the palette's #D97706 at full strength, carrying its #09090B rather
      than white: white on amber 600 is 3.18:1, the near-black is 6.25:1. Pinned
      to the 600 step rather than the semantic token, so the band is the same
      amber in light and in dark and nothing here has to flip.

      The heading overrides the h1/h2/h3 base colour, which is the only place on
      the site that rule needs escaping: the band supplies its own ink.
    -->
    <section class="bg-primary-600">
      <div class="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-4 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-20">
        <div class="max-w-xl">
          <h2 class="on-accent text-3xl font-semibold tracking-tight sm:text-4xl">
            See your business in plain language.
          </h2>
          <p class="on-accent mt-3 text-lg leading-relaxed opacity-80">
            Free to sign up. Your first findings arrive minutes after your data
            is in.
          </p>
        </div>

        <UButton
          to="/login?mode=signup"
          size="xl"
          color="neutral"
          trailing-icon="i-lucide-arrow-right"
          class="shrink-0"
        >
          Get started
        </UButton>
      </div>
    </section>
  </div>
</template>
