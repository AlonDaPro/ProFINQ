<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { Badge } from '@/components/ui/badge';
import { formatFullName, type Profile } from '@/domain/profile';
import { en } from '@/i18n/en';

const props = defineProps<{
  profile: Profile;
  to: RouteLocationRaw;
  saved: boolean;
}>();

const fullName = computed(() => formatFullName(props.profile.name));
</script>

<template>
  <li>
    <RouterLink :to="to" class="row">
      <img
        class="thumbnail"
        :src="profile.picture.thumbnail"
        alt=""
        width="44"
        height="44"
        loading="lazy"
        decoding="async"
      />
      <span class="name">
        <bdi>{{ fullName }}</bdi>
        <Badge v-if="saved" variant="brand">{{ en.list.savedBadge }}</Badge>
      </span>
      <span class="cell">
        <span class="cell-label">{{ en.list.columns.gender }}</span>
        {{ profile.gender }}
      </span>
      <span class="cell">
        <span class="cell-label">{{ en.list.columns.country }}</span>
        <bdi>{{ profile.location.country }}</bdi>
      </span>
      <span class="cell">
        <span class="cell-label">{{ en.list.columns.phone }}</span>
        <span dir="ltr">{{ profile.phone }}</span>
      </span>
      <span class="cell">
        <span class="cell-label">{{ en.list.columns.email }}</span>
        <span dir="ltr">{{ profile.email }}</span>
      </span>
    </RouterLink>
  </li>
</template>

<style scoped>
li + li {
  border-block-start: 1px solid var(--color-line);
}

.row {
  display: grid;
  grid-template-columns: var(--profile-list-columns);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  color: inherit;
  text-decoration: none;
  transition: background-color var(--duration-fast) ease;
}

.row:hover {
  background: var(--color-lavender-50);
}

.row:focus-visible {
  outline-offset: -3px;
}

.thumbnail {
  inline-size: var(--thumbnail-size);
  block-size: var(--thumbnail-size);
  border-radius: 50%;
  background: var(--color-surface-soft);
  object-fit: cover;
}

.name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--weight-medium);
}

.cell {
  color: var(--color-ink-muted);
  overflow-wrap: anywhere;
}

/* The column header names each cell on wide screens; the label is for screen readers there. */
.cell-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 860px) {
  .row {
    grid-template-columns: var(--thumbnail-size) 1fr;
    row-gap: var(--space-1);
    padding-block: var(--space-4);
  }

  .thumbnail {
    grid-row: span 5;
    align-self: start;
  }

  .cell-label {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
    margin-inline-end: var(--space-2);
    color: var(--color-ink);
    font-weight: var(--weight-medium);
  }
}
</style>
