<script setup lang="ts">
import ProfinqLogo from '@/components/brand/ProfinqLogo.vue';
import { en } from '@/i18n/en';
import { RouteName } from '@/router/routeNames';
</script>

<template>
  <header class="app-header">
    <nav class="page-width app-nav" :aria-label="en.nav.label">
      <RouterLink :to="{ name: RouteName.Home }" class="brand">
        <ProfinqLogo class="brand-logo" />
      </RouterLink>
      <RouterLink :to="{ name: RouteName.RandomList }" class="nav-link">{{ en.nav.random }}</RouterLink>
      <RouterLink :to="{ name: RouteName.SavedList }" class="nav-link">{{ en.nav.history }}</RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
  border-block-end: 1px solid var(--color-line);
  background: rgb(255 255 255 / 88%);
  backdrop-filter: blur(12px);
}

.app-nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-block-size: 4rem;
}

.brand {
  display: inline-flex;
  margin-inline-end: auto;
  padding-block: var(--space-2);
  color: var(--color-ink);
}

.brand-logo {
  block-size: 1.625rem;
  inline-size: auto;
}

.nav-link {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  text-decoration: none;
}

.nav-link:hover {
  background: var(--color-surface-soft);
}

.nav-link.router-link-active {
  background: var(--color-lavender-50);
  color: var(--color-brand);
}
</style>
