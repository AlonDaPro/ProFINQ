<script setup lang="ts">
import { nextTick, onUnmounted, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { en } from '@/i18n/en';

const main = useTemplateRef<HTMLElement>('main');

// A client-side page change is silent for screen readers and leaves focus on the old link. Move
// focus to the new page, as a full page load would. Query-only changes (the list filter) are skipped,
// so typing in a filter never loses focus; so is the first load, where focus belongs to the browser.
const removeAfterEach = useRouter().afterEach((to, from, failure) => {
  if (failure || from.matched.length === 0 || to.path === from.path) return;
  void nextTick(() => main.value?.focus({ preventScroll: true }));
});
onUnmounted(removeAfterEach);
</script>

<template>
  <a class="skip-link" href="#main">{{ en.nav.skipToContent }}</a>
  <AppHeader />
  <!-- Full width: each view decides between full-bleed bands and the centered .container. -->
  <main id="main" ref="main" class="app-main" tabindex="-1">
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
