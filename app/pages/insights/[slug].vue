<script setup lang="ts">
import { formatPercentChange } from '#shared/format'
import type { PublishedInsight } from '#shared/schemas'

const route = useRoute()
const config = useRuntimeConfig()
const slug = String(route.params.slug)

/**
 * The host this page was actually served from, preferred over the configured
 * site URL. NUXT_PUBLIC_SITE_URL is baked in at build time, so a wrong or stale
 * value silently publishes share links pointing at a host that does not exist —
 * and it can only be corrected by a full redeploy. Reading the request means the
 * canonical URL is right wherever this is deployed, with the configured value
 * kept as a fallback for prerendering.
 */
const requestOrigin = useRequestURL().origin
const siteOrigin = computed(() => requestOrigin || config.public.siteUrl)

const { data: insight, error } = await useFetch<PublishedInsight>(`/api/insights/${slug}`)

if (error.value || !insight.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'This published insight could not be found.'
  })
}

const publishedInsight = insight.value
const pageTitle = computed(() =>
  `${publishedInsight.displayName}: ${publishedInsight.metricLabel} — InsightFlow`
)
const canonicalUrl = computed(() =>
  `${siteOrigin.value}/insights/${publishedInsight.slug}`
)

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
    <NuxtLink to="/insights" class="inline-flex items-center gap-2 text-sm text-primary">
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      Insight feed
    </NuxtLink>

    <header class="mt-8">
      <InsightsInsightMeta
        :display-name="publishedInsight.displayName"
        :business-type="publishedInsight.businessType"
        :published-at="publishedInsight.publishedAt"
      />

      <h1 class="mt-4 text-2xl font-semibold tracking-tight">
        {{ publishedInsight.metricLabel }}
      </h1>

      <p class="mt-4 text-2xl font-semibold tracking-tight">
        {{ formatPercentChange(publishedInsight.metricValue) }}
      </p>

      <p class="mt-2 text-sm text-muted">
        Shared as a change, not a figure.
      </p>

      <p class="mt-4 text-lg text-muted">
        {{ publishedInsight.caption }}
      </p>
    </header>

    <!--
      The honest answer to "what next". There is no sign-up in this product, so
      inviting a stranger to create an account would be selling something that does
      not exist. What is true is that they can read more, and that the same pattern
      is probably sitting in their own records.
    -->
    <footer class="mt-12 border-t border-default pt-8">
      <h2 class="text-base font-semibold">
        What now?
      </h2>

      <p class="mt-2 max-w-xl text-sm text-muted">
        There is nothing to sign up for here. This is one business sharing something
        they noticed in their own sales. If you keep a record of yours, the same kind
        of pattern is probably already sitting in it.
      </p>

      <UButton to="/insights" color="neutral" variant="subtle" class="mt-6">
        Read other insights
      </UButton>
    </footer>
  </article>
</template>
