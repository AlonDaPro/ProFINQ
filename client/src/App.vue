<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { en } from '@/i18n/en';
</script>

<template>
  <a class="skip-link" href="#main">{{ en.nav.skipToContent }}</a>
  <AppHeader />
  <!-- Full width: each view decides between full-bleed bands and the centered .container. -->
  <main id="main" class="app-main" tabindex="-1">
    <RouterView />
  </main>
  <ConfirmDialog />
</template>

<style scoped>
.app-main {
  outline: none;
}

.skip-link {
  position: absolute;
  inset-inline-start: var(--space-3);
  inset-block-start: calc(-1 * var(--space-8));
  z-index: 2;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--color-ink);
  color: var(--color-paper);
}

.skip-link:focus {
  inset-block-start: var(--space-3);
}
</style>
