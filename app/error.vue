<!-- Owner: M4 -->
<template>
  <div>
    <h1>{{ error.statusCode }}</h1>
    <p>{{ error.message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ error: { statusCode: number; message: string } }>()
</script>
