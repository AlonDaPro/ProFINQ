<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Sparkle } from '@lucide/vue';
import FlowCards from '@/components/decor/FlowCards.vue';
import AboutSection from '@/components/layout/AboutSection.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { en } from '@/i18n/en';
import { RouteName } from '@/router/routeNames';
import { useRandomProfilesStore } from '@/stores/randomProfiles';
import { useSavedProfilesStore } from '@/stores/savedProfiles';
import { AsyncStatus } from '@/types/asyncState';

const router = useRouter();
const randomProfiles = useRandomProfilesStore();
const savedProfiles = useSavedProfilesStore();

// The count is a hint, not a requirement: if the API is down, Home still works.
onMounted(() => void savedProfiles.ensureLoaded());

const savedCount = computed(() =>
  savedProfiles.state.status === AsyncStatus.Success ? savedProfiles.profiles.length : null,
);

async function fetchRandomPeople(): Promise<void> {
  // Navigate immediately and let the list show its loading state,
  // rather than leaving the user on an unresponsive home screen.
  void randomProfiles.fetchBatch();
  await router.push({ name: RouteName.RandomList });
}
</script>

<template>
  <section class="home">
    <div class="page-width hero">
      <Sparkle class="sparkle" aria-hidden="true" />
      <h1 class="title">{{ en.home.title }}</h1>
      <p class="lead">{{ en.home.lead }}</p>
      <div class="actions">
        <Button size="lg" class="min-w-36" @click="fetchRandomPeople">{{ en.home.fetch }}</Button>
        <Button as-child size="lg" variant="outline" class="min-w-36">
          <RouterLink :to="{ name: RouteName.SavedList }">
            {{ en.home.history }}
            <Badge v-if="savedCount !== null" variant="brand">{{ en.home.savedCount(savedCount) }}</Badge>
          </RouterLink>
        </Button>
      </div>
    </div>
    <FlowCards class="page-width" />
  </section>
  <AboutSection />
</template>

<style scoped>
.home {
  position: relative;
  isolation: isolate;
  padding-block: var(--space-9);
  overflow-x: clip;
}

/* Faint grid lines behind the hero, fading out towards the edges. */
.home::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(var(--color-line) 1px, transparent 1px) center / 9rem 9rem,
    linear-gradient(90deg, var(--color-line) 1px, transparent 1px) center / 9rem 9rem;
  mask-image: radial-gradient(ellipse 60% 55% at 50% 45%, #000 30%, transparent 75%);
}

.hero {
  position: relative;
  display: grid;
  justify-items: center;
  margin-block-end: var(--space-9);
  text-align: center;
}

.sparkle {
  position: absolute;
  inset-block-start: calc(-1 * var(--space-6));
  inset-inline-end: 12%;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  fill: var(--color-lavender-400);
  stroke: none;
}

.title {
  max-width: 16ch;
  font-size: var(--text-3xl);
  font-weight: var(--weight-medium);
  letter-spacing: -0.03em;
}

.lead {
  max-width: 46ch;
  margin-block: var(--space-5) var(--space-6);
  padding-block-end: var(--space-6);
  border-block-end: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  font-size: var(--text-lg);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
}

@media (max-width: 560px) {
  .home {
    padding-block-start: var(--space-8);
  }

  .hero {
    margin-block-end: var(--space-7);
  }

  .title {
    font-size: var(--text-2xl);
  }

  .sparkle {
    display: none;
  }
}
</style>
