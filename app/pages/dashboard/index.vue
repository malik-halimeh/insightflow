<script setup lang="ts">
// Placeholder so signing in lands somewhere real. This folder belongs to M3:
// replace this file wholesale rather than building on top of it.
definePageMeta({ middleware: 'auth', layout: 'app' })

useSeoMeta({ title: 'Dashboard — InsightFlow' })
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="text-2xl font-semibold tracking-tight">
      Dashboard
    </h1>

    <p class="mt-3 text-muted">
      You are signed in. Charts and figures for your sales data will appear here.
    </p>

    <div class="mt-6 flex flex-wrap gap-3">
      <UButton to="/insights" color="neutral" variant="subtle">
        View the public insight feed
      </UButton>
    </div>
  </div>
</template>
