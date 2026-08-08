<script setup lang="ts">
import type { PublishedInsight } from '#shared/schemas'

useSeoMeta({
  title: 'Insight feed - InsightFlow',
  description: 'Plain-language sales findings shared by small businesses.'
})

const { data: insights, status, error } = await useFetch('/api/insights', {
  default: (): PublishedInsight[] => []
})

// Counted from the feed itself rather than fetched separately: the page already
// holds every published insight, so a second request would only be a chance for
// the two figures to disagree.
const businessCount = computed(() =>
  new Set(insights.value.map(insight => insight.displayName)).size
)

const risingCount = computed(() =>
  insights.value.filter(insight => insight.metricValue > 0).length
)
</script>

<template>
  <div>
    <header class="border-b border-default pb-8">
      <h1 class="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
        What small businesses learned from their own sales
      </h1>

      <!--
        States the rule rather than leaving a reader to notice the gap. Without
        this line the missing figures read as something the page forgot; with it,
        they read as the point.
      -->
      <p class="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
        Everyone here shares what changed, never what they earn. You will not find
        anyone's takings on this page.
      </p>
    </header>

    <div v-if="status === 'pending'" class="grid gap-4 pt-8 sm:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="card in 6" :key="card" class="h-64 w-full" />
    </div>

    <UAlert
      v-else-if="error"
      class="mt-8"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="The insight feed could not be loaded"
      description="Please refresh the page and try again."
    />

    <UiEmptyState
      v-else-if="insights.length === 0"
      class="mt-8"
      icon="i-lucide-radio"
      title="No insights published yet"
      description="When a business finds something in its sales worth sharing, it appears here. Nothing has been published so far."
    >
      <template #action>
        <UButton to="/login?mode=signup" trailing-icon="i-lucide-arrow-right">
          Get started
        </UButton>
      </template>
    </UiEmptyState>

    <template v-else>
      <!-- Three live figures about the feed, read from the feed. -->
      <div class="grid grid-cols-3 gap-x-6 gap-y-4 border-b border-default py-6">
        <div>
          <p class="figure text-3xl ink-accent">
            {{ insights.length }}
          </p>
          <p class="mt-1.5 text-sm text-muted">
            {{ insights.length === 1 ? 'finding published' : 'findings published' }}
          </p>
        </div>

        <div>
          <p class="figure text-3xl ink-accent">
            {{ businessCount }}
          </p>
          <p class="mt-1.5 text-sm text-muted">
            {{ businessCount === 1 ? 'business sharing' : 'businesses sharing' }}
          </p>
        </div>

        <div>
          <p class="figure text-3xl ink-accent">
            {{ risingCount }}
          </p>
          <p class="mt-1.5 text-sm text-muted">
            {{ risingCount === 1 ? 'reports a rise' : 'report a rise' }}
          </p>
        </div>
      </div>

      <div class="reveal grid gap-4 pt-8 sm:grid-cols-2 lg:grid-cols-3">
        <InsightsInsightCard
          v-for="insight in insights"
          :key="insight.id"
          :insight="insight"
        />
      </div>

      <!-- The feed is the public surface, so it is also where the invitation goes. -->
      <section class="mt-12 rounded-[calc(var(--ui-radius)*1.5)] bg-primary-600 px-6 py-8 sm:px-10 sm:py-10">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="max-w-lg">
            <h2 class="on-accent text-2xl font-semibold tracking-tight">
              The same pattern is probably in your own sales.
            </h2>
            <p class="on-accent mt-2 leading-relaxed opacity-80">
              Upload a spreadsheet and find out. Free to sign up, and nothing is
              published unless you choose to.
            </p>
          </div>

          <UButton
            to="/login?mode=signup"
            size="lg"
            color="neutral"
            trailing-icon="i-lucide-arrow-right"
            class="shrink-0"
          >
            Get started
          </UButton>
        </div>
      </section>
    </template>
  </div>
</template>
