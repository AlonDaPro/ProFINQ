<script setup lang="ts">
import { useId } from 'vue';
import ProfinqLogo from '@/components/brand/ProfinqLogo.vue';
import { Button } from '@/components/ui/button';
import { AUTHOR_NAME, SOURCE_URL } from '@/constants/app';
import { en } from '@/i18n/en';

const titleId = useId();
</script>

<template>
  <section class="about" :aria-labelledby="titleId">
    <div class="page-width about-grid">
      <div class="intro">
        <ProfinqLogo class="logo" />
        <h2 :id="titleId" class="title">{{ en.about.title }}</h2>
        <p class="body">{{ en.about.body }}</p>
        <p class="credit">
          {{ en.about.credit }} <strong>{{ AUTHOR_NAME }}</strong>
        </p>
        <Button as-child variant="outline-inverse">
          <a :href="SOURCE_URL" target="_blank" rel="noopener noreferrer">{{ en.about.source }}</a>
        </Button>
      </div>
      <dl class="stack">
        <div v-for="item in en.about.stack" :key="item.term" class="stack-item">
          <dt>{{ item.term }}</dt>
          <dd>{{ item.detail }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.about {
  position: relative;
  isolation: isolate;
  padding-block: var(--space-9);
  background: var(--color-ink);
  color: var(--color-paper);
}

.about::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: url('/grain.svg');
  opacity: 0.08;
}

.about-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--space-9);
}

.logo {
  block-size: 2rem;
  inline-size: auto;
  margin-block-end: var(--space-6);
}

.title {
  max-width: 18ch;
  font-size: var(--text-2xl);
  font-weight: var(--weight-semibold);
  /* The FINQ dark-section treatment: the headline itself carries the brand pastels. */
  background: linear-gradient(90deg, var(--color-lavender-400), var(--color-gold-200) 60%, var(--color-gold-400));
  background-clip: text;
  color: transparent;
}

.body {
  max-width: 54ch;
  margin-block: var(--space-5);
  color: rgb(255 255 255 / 78%);
  font-size: var(--text-lg);
}

.credit {
  margin-block-end: var(--space-6);
  color: rgb(255 255 255 / 78%);
}

.credit strong {
  color: var(--color-paper);
  font-weight: var(--weight-medium);
}

.stack {
  display: grid;
  gap: var(--space-3);
  margin: 0;
}

.stack-item {
  padding: var(--space-5);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: var(--radius-lg);
  background: rgb(255 255 255 / 4%);
}

dt {
  margin-block-end: var(--space-1);
  color: var(--color-lavender-400);
  font-weight: var(--weight-medium);
}

dd {
  margin: 0;
  color: rgb(255 255 255 / 78%);
}

@media (max-width: 860px) {
  .about-grid {
    grid-template-columns: 1fr;
    gap: var(--space-7);
  }
}
</style>
