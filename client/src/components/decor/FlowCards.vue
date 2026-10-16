<script setup lang="ts">
import { Clock, PencilLine, RefreshCw, type LucideIcon } from '@lucide/vue';
import { en } from '@/i18n/en';

enum StepTone {
  Mint = 'mint',
  Lavender = 'lavender',
  Gold = 'gold',
}

interface FlowStep {
  title: string;
  body: string;
  tone: StepTone;
  icon: LucideIcon;
}

// The user's flow, in order, so it renders as an ordered list.
const STEPS: readonly FlowStep[] = [
  {
    ...en.home.steps.fetch,
    tone: StepTone.Mint,
    icon: RefreshCw,
  },
  { ...en.home.steps.save, tone: StepTone.Lavender, icon: PencilLine },
  { ...en.home.steps.history, tone: StepTone.Gold, icon: Clock },
];
</script>

<template>
  <ol class="flow" :aria-label="en.home.stepsLabel">
    <li v-for="step in STEPS" :key="step.title" class="step" :class="`step--${step.tone}`">
      <span class="step-icon" aria-hidden="true">
        <component :is="step.icon" :size="20" :stroke-width="1.8" />
      </span>
      <h2 class="step-title">{{ step.title }}</h2>
      <p class="step-body">{{ step.body }}</p>
    </li>
  </ol>
</template>

<style scoped>
.flow {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 17rem));
  justify-content: center;
  margin-block: 0;
  padding-block: 0;
  list-style: none;
}

.step {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-block-size: 17rem;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lift);
  overflow: hidden;
}

/* The same grain as the page bands, so the cards read as printed, not flat fills. */
.step::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: url('/grain.svg');
  opacity: 0.14;
  mix-blend-mode: multiply;
}

/* Fanned like a hand of cards: the middle step is raised and in front. */
.step--mint {
  background: linear-gradient(160deg, var(--color-mint-200), var(--color-mint-400));
  transform: translateY(var(--space-6)) rotate(-7deg);
  transform-origin: bottom right;
}

.step--lavender {
  z-index: 1;
  background: linear-gradient(160deg, var(--color-lavender-50), var(--color-lavender-400));
}

.step--gold {
  background: linear-gradient(160deg, var(--color-gold-200), var(--color-gold-400));
  transform: translateY(var(--space-6)) rotate(7deg);
  transform-origin: bottom left;
}

.step-icon {
  display: grid;
  place-items: center;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  margin-block-end: var(--space-4);
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.step-title {
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
}

.step-body {
  color: var(--color-ink);
  opacity: 0.8;
}

@media (max-width: 860px) {
  .flow {
    grid-template-columns: minmax(0, 26rem);
    gap: var(--space-3);
  }

  .step {
    min-block-size: auto;
  }

  .step--mint,
  .step--gold {
    transform: none;
  }
}
</style>
