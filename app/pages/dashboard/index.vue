<!-- Owner: M3 -->
<template>
  <div class="if-dashboard">
    <header class="if-header">
      <div>
        <p class="if-eyebrow">Private workspace</p>
        <h1 class="if-title">Dashboard</h1>
      </div>
      <DatasetSelector
        v-if="datasets && datasets.length"
        v-model="selectedDatasetId"
        :datasets="datasets"
      />
    </header>

    <!-- Loading -->
    <div v-if="datasetsPending" class="if-state">
      <div class="skeleton skeleton-hero" />
      <div class="skeleton-row">
        <div class="skeleton skeleton-card" />
        <div class="skeleton skeleton-card" />
        <div class="skeleton skeleton-card" />
        <div class="skeleton skeleton-card" />
      </div>
    </div>

    <!-- No datasets uploaded yet -->
    <div v-else-if="!datasets || !datasets.length" class="if-state if-empty">
      <p class="if-empty-title">No datasets yet</p>
      <p class="if-empty-body">
        Upload sales data from the Datasets page to see revenue trends, top sellers and
        day-of-week performance here.
      </p>
      <NuxtLink to="/datasets" class="if-link">Go to Datasets →</NuxtLink>
    </div>

    <!-- Dataset selected but summary failed to load -->
    <div v-else-if="summaryError" class="if-state if-empty">
      <p class="if-empty-title">Couldn't load analytics</p>
      <p class="if-empty-body">{{ summaryError.statusMessage || summaryError.message }}</p>
      <button class="if-link" type="button" @click="refreshSummary()">Try again</button>
    </div>

    <!-- Main dashboard -->
    <div v-else-if="summary" class="if-content">
      <!-- Hero: the one headline stat -->
      <section class="hero" v-if="heroStat">
        <DeltaChip :value="heroStat.delta.value" size="md" />
        <p class="hero-figure">{{ formatSignedPercent(heroStat.delta.value) }}</p>
        <p class="hero-body">{{ heroSentence }}</p>
        <p class="hero-caption">
          Based on {{ summary.dataset.rowCount.toLocaleString() }} rows ·
          {{ summary.dataset.periodStart }} → {{ summary.dataset.periodEnd }}
        </p>
      </section>

      <!-- KPI strip -->
      <section class="kpi-strip">
        <KpiCard
          label="Total revenue"
          :value="`$${summary.kpis.totalRevenue.toLocaleString()}`"
          :delta="summary.kpis.revenueDelta.value"
          caption="2nd half vs 1st half"
        />
        <KpiCard
          label="Units sold"
          :value="summary.kpis.totalUnits.toLocaleString()"
          caption="Across the full period"
        />
        <KpiCard
          label="Avg. daily revenue"
          :value="`$${summary.kpis.avgDailyRevenue.toLocaleString()}`"
          caption="Per active day"
        />
        <KpiCard
          label="Menu items tracked"
          :value="summary.kpis.distinctItems.toLocaleString()"
          caption="Distinct items sold"
        />
      </section>

      <!-- Charts -->
      <section class="chart-grid">
        <RevenueTrendChart
          class="span-2"
          :trend="summary.revenueTrend"
          :delta-value="summary.kpis.revenueDelta.value"
        />
        <DayOfWeekChart :days="summary.dayOfWeek" />
        <CategoryBreakdown :categories="summary.categories" />
      </section>

      <!-- Top items -->
      <section>
        <TopItemsTable :items="summary.topItems" />
      </section>

      <!-- Publish hook (M4 owns the endpoint) -->
      <section class="publish-row">
        <div>
          <p class="publish-title">Share a finding to the public feed</p>
          <p class="publish-body">
            Picks the headline stat above and hands it off for publishing.
          </p>
        </div>
        <button class="if-button" type="button" disabled title="Publishing goes live once /api/publish (M4) ships">
          Publish headline finding
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AnalyticsSummary, DatasetSummary } from '~~/shared/types/analytics'
// Explicit imports instead of relying on Nuxt's components/ auto-scan — on
// some setups (notably Windows dev folders under OneDrive/Downloads, where
// the file watcher misses events) auto-import silently fails to register
// components, producing "Failed to resolve component" warnings and blank
// spots on the page. Explicit imports always work regardless of the scanner.
import DatasetSelector from '~/components/dashboard/DatasetSelector.vue'
import DeltaChip from '~/components/dashboard/DeltaChip.vue'
import KpiCard from '~/components/dashboard/KpiCard.vue'
import RevenueTrendChart from '~/components/dashboard/RevenueTrendChart.vue'
import DayOfWeekChart from '~/components/dashboard/DayOfWeekChart.vue'
import CategoryBreakdown from '~/components/dashboard/CategoryBreakdown.vue'
import TopItemsTable from '~/components/dashboard/TopItemsTable.vue'

definePageMeta({ middleware: 'auth' })

const { data: datasets, pending: datasetsPending } = await useFetch<DatasetSummary[]>(
  '/api/analytics/datasets',
)

const selectedDatasetId = ref<string>('')
watch(
  datasets,
  (list) => {
    if (list && list.length && !selectedDatasetId.value) {
      selectedDatasetId.value = list[0]._id
    }
  },
  { immediate: true },
)

const {
  data: summary,
  error: summaryError,
  refresh: refreshSummary,
} = await useFetch<AnalyticsSummary>(
  () => `/api/analytics/${selectedDatasetId.value}/summary`,
  { watch: [selectedDatasetId], immediate: false },
)

watch(
  selectedDatasetId,
  (id) => {
    if (id) refreshSummary()
  },
  { immediate: true },
)

const heroStat = computed(() => summary.value?.busiestDay ?? null)

const heroSentence = computed(() => {
  const s = summary.value
  const hero = heroStat.value
  if (!s || !hero) return ''
  const quiet = s.quietestDay
  if (quiet && quiet.day !== hero.day) {
    return `${hero.day}s are ${Math.abs(hero.delta.value)}% ${hero.delta.value >= 0 ? 'busier' : 'quieter'} than ${quiet.day}s here.`
  }
  return `${hero.day}s run ${Math.abs(hero.delta.value)}% ${hero.delta.value >= 0 ? 'above' : 'below'} the weekly average.`
})

function formatSignedPercent(v: number) {
  return `${v > 0 ? '+' : ''}${v}%`
}
</script>

<style>
/* Owner: M3 — design tokens (design token sheet: InsightFlow — Visual Direction)
   Scoped to .if-dashboard so this page doesn't leak styling onto pages owned
   by other members. M1: happy to move this into nuxt.config's css[] once the
   rest of the app is ready to share one token file. */
.if-dashboard {
  --if-ink: #1a2233;
  --if-paper: #f4f5f7;
  --if-brand: #3b5ba5;
  --if-positive: #1cbb6e;
  --if-negative: #c4562a;
  --if-flat: #6b7280;
  --if-surface: #ebedef;
  --if-hairline: rgba(26, 34, 51, 0.12);
  --if-font: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

  font-family: var(--if-font);
  color: var(--if-ink);
  background: var(--if-paper);
  min-height: 100vh;
  padding: 24px clamp(16px, 4vw, 40px) 64px;
}
</style>

<style scoped>
.if-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.if-eyebrow {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--if-brand);
}

.if-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
}

.if-state {
  margin-top: 24px;
}

.if-empty {
  background: var(--if-surface);
  border: 1px solid var(--if-hairline);
  border-radius: 8px;
  padding: 32px;
  max-width: 480px;
}

.if-empty-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
}

.if-empty-body {
  margin: 0 0 16px;
  font-size: 14px;
  opacity: 0.7;
  line-height: 1.5;
}

.if-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--if-brand);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: none;
}
.if-link:hover {
  text-decoration: underline;
}

.if-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero {
  background: var(--if-surface);
  border: 1px solid var(--if-hairline);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.hero-figure {
  margin: 4px 0 0;
  font-size: 48px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.hero-body {
  margin: 4px 0 0;
  font-size: 16px;
  font-weight: 400;
}

.hero-caption {
  margin: 0;
  font-size: 13px;
  opacity: 0.6;
}

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.span-2 {
  grid-column: 1 / -1;
}

.publish-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: var(--if-surface);
  border: 1px solid var(--if-hairline);
  border-radius: 8px;
  padding: 16px;
}

.publish-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.publish-body {
  margin: 0;
  font-size: 13px;
  opacity: 0.6;
}

.if-button {
  font-family: var(--if-font);
  font-size: 14px;
  font-weight: 600;
  color: var(--if-paper);
  background: var(--if-brand);
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: not-allowed;
  opacity: 0.5;
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--if-surface) 25%,
    color-mix(in srgb, var(--if-surface) 60%, white) 50%,
    var(--if-surface) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 8px;
}

.skeleton-hero {
  height: 140px;
  margin-bottom: 16px;
}

.skeleton-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.skeleton-card {
  height: 88px;
  border-radius: 4px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}

@media (max-width: 900px) {
  .kpi-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .chart-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .span-2 {
    grid-column: auto;
  }
}

@media (max-width: 520px) {
  .kpi-strip {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
