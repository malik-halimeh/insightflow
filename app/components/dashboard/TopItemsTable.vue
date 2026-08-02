<!-- Owner: M3 -->
<template>
  <div class="table-card">
    <h3 class="chart-title">Top sellers</h3>
    <p class="chart-sub">Ranked by units sold. Each row shows how far it leads the item below it.</p>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Category</th>
          <th class="num">Units</th>
          <th class="num">Revenue</th>
          <th>vs. next best seller</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.itemName">
          <td class="item-name">{{ item.itemName }}</td>
          <td class="category">{{ item.category }}</td>
          <td class="num">{{ item.unitsSold.toLocaleString() }}</td>
          <td class="num">${{ item.revenue.toLocaleString() }}</td>
          <td>
            <DeltaChip v-if="item.deltaVsNext" :value="item.deltaVsNext.value" size="sm" />
            <span v-else class="muted">—</span>
          </td>
        </tr>
        <tr v-if="!items.length">
          <td colspan="5" class="muted empty-row">No sales rows for this dataset yet.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { TopItemStat } from '~~/shared/types/analytics'
// Explicit import instead of relying on Nuxt's components/ auto-scan — see
// the note in app/pages/dashboard/index.vue.
import DeltaChip from './DeltaChip.vue'

defineProps<{ items: TopItemStat[] }>()
</script>

<style scoped>
.table-card {
  background: var(--if-surface);
  border: 1px solid var(--if-hairline);
  border-radius: 8px;
  padding: 16px;
}

.chart-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--if-ink);
}

.chart-sub {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--if-ink);
  opacity: 0.6;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.items-table th {
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--if-ink);
  opacity: 0.55;
  padding: 0 8px 8px;
  border-bottom: 1px solid var(--if-hairline);
}

.items-table td {
  padding: 8px;
  border-bottom: 1px solid var(--if-hairline);
  color: var(--if-ink);
  vertical-align: middle;
}

.items-table tr:last-child td {
  border-bottom: none;
}

.item-name {
  font-weight: 600;
}

.category {
  opacity: 0.65;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.muted {
  opacity: 0.5;
}

.empty-row {
  text-align: center;
  padding: 24px 8px;
}
</style>
