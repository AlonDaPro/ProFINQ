<script setup lang="ts">
import { RANDOM_BATCH_SIZE } from '@/constants/app';
import { en } from '@/i18n/en';
</script>

<template>
  <!-- Same row geometry as the real list, so nothing jumps when the data arrives. -->
  <div class="skeleton" role="status">
    <span class="sr-only">{{ en.list.loading }}</span>
    <div v-for="row in RANDOM_BATCH_SIZE" :key="row" class="skeleton-row" aria-hidden="true">
      <span class="block block--thumbnail" />
      <span class="block" />
      <span class="block block--short" />
      <span class="block block--short" />
      <span class="block" />
      <span class="block" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-row {
  display: grid;
  grid-template-columns: var(--profile-list-columns);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
}

.skeleton-row + .skeleton-row {
  border-block-start: 1px solid var(--color-line);
}

.block {
  block-size: 0.75rem;
  inline-size: 80%;
  border-radius: var(--radius-pill);
  background: var(--color-line);
  animation: pulse 1.4s ease-in-out infinite;
}

.block--short {
  inline-size: 50%;
}

.block--thumbnail {
  inline-size: var(--thumbnail-size);
  block-size: var(--thumbnail-size);
  border-radius: 50%;
}

@keyframes pulse {
  50% {
    opacity: 0.45;
  }
}

@media (max-width: 860px) {
  .skeleton-row {
    grid-template-columns: var(--thumbnail-size) 1fr;
  }

  .block:nth-child(n + 4) {
    display: none;
  }
}
</style>
