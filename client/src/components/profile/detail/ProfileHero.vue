<script setup lang="ts">
import { computed } from 'vue';
import SavedBadge from '@/components/profile/detail/SavedBadge.vue';
import { Badge } from '@/components/ui/badge';
import { formatFullName, type Profile } from '@/domain/profile';
import { he } from '@/i18n/he';

const props = defineProps<{
  profile: Profile;
  /** Present only when the profile is in the database. */
  savedAt?: string;
}>();

const fullName = computed(() => formatFullName(props.profile.name));
</script>

<template>
  <div class="hero">
    <!-- alt="": the heading next to it already names the person. -->
    <img :src="profile.picture.large" alt="" class="portrait" width="160" height="160" fetchpriority="high" />
    <div class="identity">
      <Badge variant="tag">{{ he.documentTitle }}</Badge>
      <h1>
        <bdi>{{ fullName }}</bdi>
      </h1>
      <!-- Transition only animates a change, so the badge pops in on Save but not on page load. -->
      <Transition name="pop" mode="out-in">
        <SavedBadge v-if="savedAt" :saved-at="savedAt" />
        <p v-else class="unsaved">{{ he.status.notSaved }}</p>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: center;
  gap: var(--space-7);
}

.portrait {
  flex-shrink: 0;
  border: 6px solid var(--color-surface);
  border-radius: var(--radius-lg);
  background: var(--color-surface-soft);
  box-shadow: var(--shadow-lift);
  object-fit: cover;
}

.identity {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  min-width: 0;
}

.identity h1 {
  font-size: var(--text-2xl);
}

.unsaved {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  background: rgb(255 255 255 / 70%);
  color: var(--color-ink-muted);
  font-size: var(--text-sm);
}

.pop-enter-active {
  transition:
    transform var(--duration-pop) var(--ease-out),
    opacity var(--duration-pop) var(--ease-out);
}

.pop-enter-from {
  opacity: 0;
  transform: scale(0.6);
}

@media (max-width: 560px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-5);
  }

  .portrait {
    width: 112px;
    height: 112px;
  }

  .identity h1 {
    font-size: var(--text-xl);
  }
}
</style>
