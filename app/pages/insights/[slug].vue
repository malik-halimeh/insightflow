<script setup lang="ts">
import { changeDirection, formatPercentChange } from '#shared/format'
import type { PublishedInsight } from '#shared/schemas'

const TONE = {
  up: 'text-success',
  down: 'text-error',
  flat: 'text-muted'
} as const

const ICON = {
  up: 'i-lucide-arrow-up-right',
  down: 'i-lucide-arrow-down-right',
  flat: 'i-lucide-minus'
} as const

const route = useRoute()
const config = useRuntimeConfig()
const slug = String(route.params.slug)

// Render exposes its internal request origin as localhost. Prefer the configured
// public host for metadata and keep the request origin as a local fallback.
const requestOrigin = useRequestURL().origin
const configuredOrigin = String(config.public.siteUrl).replace(/\/$/, '')
const siteOrigin = computed(() => configuredOrigin || requestOrigin)

const { data: insight, error } = await useFetch<PublishedInsight>(`/api/insights/${slug}`)

if (error.value || !insight.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'This published insight could not be found.'
  })
}

const publishedInsight = insight.value
const direction = changeDirection(publishedInsight.metricValue)
const pageTitle = computed(() =>
  `${publishedInsight.displayName}: ${publishedInsight.metricLabel} - InsightFlow`
)
const canonicalUrl = computed(() =>
  `${siteOrigin.value}/insights/${publishedInsight.slug}`
)

useHead({
  link: [{
    rel: 'canonical',
    href: () => canonicalUrl.value
  }]
})

useSeoMeta({
  title: () => pageTitle.value,
  description: () => publishedInsight.caption,
  ogTitle: () => pageTitle.value,
  ogDescription: () => publishedInsight.caption,
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary',
  twitterTitle: () => pageTitle.value,
  twitterDescription: () => publishedInsight.caption
})
</script>

<template>
  <article class="max-w-2xl">
    <NuxtLink to="/insights" class="inline-flex items-center gap-2 text-sm font-medium ink-accent hover:underline">
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      Insight feed
    </NuxtLink>

    <header class="mt-8">
      <InsightsInsightMeta
        :display-name="publishedInsight.displayName"
        :business-type="publishedInsight.businessType"
        :published-at="publishedInsight.publishedAt"
      />

      <!--
        The change is the finding. It is printed at display size and tinted by
        direction, with the arrow carrying the same meaning as the colour, so it
        reads the same way here as it does on the card that led here.
      -->
      <p class="figure mt-8 flex items-center gap-3 text-6xl sm:text-7xl" :class="TONE[direction]">
        <UIcon :name="ICON[direction]" class="size-10 shrink-0 sm:size-12" />
        {{ formatPercentChange(publishedInsight.metricValue) }}
      </p>

      <h1 class="mt-6 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
        {{ publishedInsight.metricLabel }}
      </h1>

      <p class="mt-4 text-lg leading-relaxed text-muted">
        {{ publishedInsight.caption }}
      </p>

      <p class="mt-6 inline-flex items-center gap-2 rounded-full bg-elevated px-3 py-1.5 text-xs text-muted">
        <UIcon name="i-lucide-lock" class="size-3.5" />
        {{ publishedInsight.hideAbsoluteNumbers
          ? 'This business chose to hide its takings. Only the change is shared.'
          : 'A percentage change only. No takings are shared.' }}
      </p>
    </header>

    <!--
      The honest answer to "what next". This is one business sharing something they
      noticed, and the useful thing to say to a stranger reading it is that the same
      pattern is probably sitting in their own records, and that they can look.
    -->
    <footer class="mt-12 border-t border-default pt-8">
      <h2 class="text-lg font-semibold">
        What now?
      </h2>

      <p class="mt-2 text-muted">
        If you keep a record of your own sales, the same kind of pattern is
        probably already sitting in it. Upload a spreadsheet and find out, or
        read what other businesses have published.
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <UButton to="/login?mode=signup" trailing-icon="i-lucide-arrow-right">
          Get started
        </UButton>
        <UButton to="/insights" color="neutral" variant="subtle">
          Read the insight feed
        </UButton>
      </div>
    </footer>
  </article>
</template>
