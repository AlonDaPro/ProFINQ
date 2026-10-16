<script setup lang="ts">
import { computed } from 'vue';
import { FeedbackTone } from '@/types/feedback';

const props = withDefaults(
  defineProps<{
    tone?: FeedbackTone;
    /** Set to false inside a parent live region, so the message is not announced twice. */
    live?: boolean;
  }>(),
  { tone: FeedbackTone.Neutral, live: true },
);

defineSlots<{
  default(): unknown;
  action?(): unknown;
}>();

// Errors interrupt (alert); everything else is announced politely (status).
const role = computed(() => {
  if (!props.live) return undefined;
  return props.tone === FeedbackTone.Error ? 'alert' : 'status';
});
</script>

<template>
  <div class="status" :class="`status--${tone}`" :role="role">
    <p><slot /></p>
    <slot name="action" />
  </div>
</template>

<style scoped>
.status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-block: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
}

.status--error {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.status--success {
  background: var(--color-success-soft);
  color: var(--color-success);
}
</style>
