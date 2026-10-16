<script setup lang="ts" generic="T extends Profile">
import { computed, watch } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import ProfileFilters from '@/components/profile/list/ProfileFilters.vue';
import ProfileListItem from '@/components/profile/list/ProfileListItem.vue';
import ProfileListSkeleton from '@/components/profile/list/ProfileListSkeleton.vue';
import StatusMessage from '@/components/common/StatusMessage.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouteFilter } from '@/composables/useRouteFilter';
import { distinctCountries, filterProfiles, isFilterActive, type ProfileFilter } from '@/domain/filter/profileFilter';
import type { Profile } from '@/domain/profile';
import { en } from '@/i18n/en';
import { AsyncStatus, type AsyncState } from '@/types/asyncState';
import { FeedbackTone } from '@/types/feedback';

/** Shared by Screen 1 (random) and Screen 2 (saved): same filters and rows, different data source. */
const props = defineProps<{
  title: string;
  /** Where the rows come from, shown as a tag above the title. */
  source: string;
  profiles: readonly T[];
  state: AsyncState;
  emptyMessage: string;
  detailRoute: (profile: T) => RouteLocationRaw;
  isSaved?: (profile: T) => boolean;
  /** More pages exist on the server: counts read "20+". */
  hasMore?: boolean;
  /** `profiles` arrive already filtered by the server; the parent reloads them on `filterChange`. */
  serverFiltered?: boolean;
  /** Server mode: the country options (the client can only see the rows it has). */
  countries?: readonly string[];
}>();

const emit = defineEmits<{ retry: []; filterChange: [filter: ProfileFilter] }>();

defineSlots<{ actions?(): unknown; footer?(): unknown }>();

const { filter, clear } = useRouteFilter();

// Server mode: tell the parent about the filter now (it loads the first page) and on every change.
watch(
  () => ({ ...filter }),
  (next) => {
    if (props.serverFiltered) emit('filterChange', next);
  },
  { immediate: true },
);

const visibleProfiles = computed(() =>
  props.serverFiltered ? props.profiles : filterProfiles(props.profiles, filter),
);
const countries = computed(() => {
  const options = props.countries ? [...props.countries] : distinctCountries(props.profiles);
  // Keep a country that came from the URL selectable even if no row has it.
  return filter.country && !options.includes(filter.country) ? [filter.country, ...options] : options;
});
const isLoading = computed(() => props.state.status === AsyncStatus.Loading);
const isLoaded = computed(() => props.state.status === AsyncStatus.Success);
const hasProfiles = computed(() => props.profiles.length > 0);
const isFiltered = computed(() => isFilterActive(filter));
/** Rows exist but none match, or (server mode) the server found none for this filter. */
const hasNoMatches = computed(() =>
  hasProfiles.value ? visibleProfiles.value.length === 0 : props.serverFiltered && isFiltered.value && isLoaded.value,
);
const resultSummary = computed(() => {
  if (!isFiltered.value) return en.list.count(props.profiles.length, props.hasMore);
  return props.serverFiltered
    ? en.list.matchCount(props.profiles.length, props.hasMore)
    : en.list.filteredCount(visibleProfiles.value.length, props.profiles.length);
});
</script>

<template>
  <section class="page" :aria-busy="isLoading">
    <header class="band page-band">
      <div class="page-width page-header">
        <div class="heading">
          <Badge variant="tag">{{ source }}</Badge>
          <h1>{{ title }}</h1>
          <p v-if="hasProfiles || hasNoMatches" class="summary" role="status">{{ resultSummary }}</p>
        </div>
        <slot name="actions" />
        <ProfileFilters
          v-model:name="filter.name"
          v-model:country="filter.country"
          class="filters"
          :countries="countries"
        />
      </div>
    </header>

    <div class="page-width content">
      <StatusMessage v-if="state.status === AsyncStatus.Error" :tone="FeedbackTone.Error">
        {{ state.message }}
        <template #action>
          <Button variant="outline" @click="emit('retry')">{{ en.list.retry }}</Button>
        </template>
      </StatusMessage>

      <Card v-if="isLoading && !hasProfiles" class="gap-0 overflow-hidden py-0">
        <ProfileListSkeleton />
      </Card>

      <StatusMessage v-else-if="hasNoMatches">
        {{ en.list.noMatches }}
        <template #action>
          <Button variant="outline" @click="clear">{{ en.list.clearFilters }}</Button>
        </template>
      </StatusMessage>

      <StatusMessage v-else-if="isLoaded && !hasProfiles">{{ emptyMessage }}</StatusMessage>

      <template v-else-if="hasProfiles">
        <Card class="gap-0 overflow-hidden py-0">
          <div class="list-header" aria-hidden="true">
            <span />
            <span>{{ en.list.columns.name }}</span>
            <span>{{ en.list.columns.gender }}</span>
            <span>{{ en.list.columns.country }}</span>
            <span>{{ en.list.columns.phone }}</span>
            <span>{{ en.list.columns.email }}</span>
          </div>
          <ul class="list">
            <ProfileListItem
              v-for="profile in visibleProfiles"
              :key="profile.id"
              :profile="profile"
              :to="detailRoute(profile)"
              :saved="isSaved?.(profile) ?? false"
            />
          </ul>
        </Card>
        <slot name="footer" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.page {
  /* One column definition shared by the header, the rows and the loading skeleton. */
  --profile-list-columns: var(--thumbnail-size) minmax(10rem, 1.6fr) 0.6fr 1fr 1.1fr 1.8fr;
}

.page-band {
  padding-block: var(--space-8) var(--space-7);
}

.page-header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: var(--space-6) var(--space-4);
}

.heading {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
}

.heading h1 {
  font-size: var(--text-2xl);
}

.summary {
  color: var(--color-ink-muted);
}

.filters {
  grid-column: 1 / -1;
}

.content {
  padding-block: var(--space-6) var(--space-8);
}

.list-header {
  display: grid;
  grid-template-columns: var(--profile-list-columns);
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  border-block-end: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 860px) {
  .list-header {
    display: none;
  }
}

@media (max-width: 560px) {
  .page-band {
    padding-block: var(--space-6);
  }

  .page-header {
    grid-template-columns: 1fr;
  }
}
</style>
