<script setup lang="ts">
import { formatPercentChange } from '#shared/format'
import type { PublishedInsight } from '#shared/schemas'

const route = useRoute()
const config = useRuntimeConfig()
const slug = String(route.params.slug)

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
  `${config.public.siteUrl}/insights/${publishedInsight.slug}`
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

      <p class="mt-4 text-lg text-muted">
        {{ publishedInsight.caption }}
      </p>
    </header>
  </article>
</template>
