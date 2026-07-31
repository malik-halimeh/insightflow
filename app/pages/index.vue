<script setup lang="ts">
useSeoMeta({
  title: 'InsightFlow — plain-language sales insights for small businesses',
  description: 'Upload your sales data and get plain-language recommendations about what is selling, what is not, and which days are worth your attention.',
  ogTitle: 'InsightFlow — plain-language sales insights for small businesses',
  ogDescription: 'Upload your sales data and get plain-language recommendations about what is selling, what is not, and which days are worth your attention.',
  ogType: 'website'
})
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="text-3xl font-semibold tracking-tight">
      InsightFlow
    </h1>

    <p class="mt-4 text-lg text-muted">
      Upload your sales data and get plain-language recommendations about what is
      selling, what is not, and which days are worth your attention.
    </p>

    <div class="mt-8 flex flex-wrap gap-3">
      <UButton to="/insights" size="lg">
        Read the insight feed
      </UButton>
      <UButton to="/login" size="lg" color="neutral" variant="subtle">
        Sign in
      </UButton>
    </div>

    <p class="mt-6 text-sm text-muted">
      The insight feed is public and needs no account.
    </p>
  </div>
</template>
