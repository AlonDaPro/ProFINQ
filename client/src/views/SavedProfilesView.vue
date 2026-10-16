<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import StatusMessage from '@/components/common/StatusMessage.vue';
import ProfileList from '@/components/profile/list/ProfileList.vue';
import { Button } from '@/components/ui/button';
import { SERVER_FILTER_DEBOUNCE_MS } from '@/constants/app';
import type { ProfileFilter } from '@/domain/filter/profileFilter';
import type { SavedProfile } from '@/domain/profile';
import { en } from '@/i18n/en';
import { detailRouteFor, ProfileSource } from '@/router/routeNames';
import { useSavedProfilesStore } from '@/stores/savedProfiles';
import { AsyncStatus } from '@/types/asyncState';
import { FeedbackTone } from '@/types/feedback';

const savedProfiles = useSavedProfilesStore();

let previousFilter: ProfileFilter | undefined;
let pendingNameLoad: ReturnType<typeof setTimeout> | undefined;

// The first call (on entry) always loads: the database may have changed in another tab, and rows
// already loaded stay visible meanwhile. Typing a name waits for a pause; a country loads at once.
function onFilterChange(filter: ProfileFilter): void {
  clearTimeout(pendingNameLoad);
  const isNameOnly = previousFilter !== undefined && previousFilter.country === filter.country;
  previousFilter = filter;
  if (isNameOnly) pendingNameLoad = setTimeout(() => void savedProfiles.load(filter), SERVER_FILTER_DEBOUNCE_MS);
  else void savedProfiles.load(filter);
}

/** Retries the filter the user asked for last, which may not be the one the list still shows. */
function retry(): void {
  void savedProfiles.load(previousFilter);
}

onMounted(() => void savedProfiles.loadCountries());
onUnmounted(() => {
  clearTimeout(pendingNameLoad);
});

const detailRoute = (profile: SavedProfile) => detailRouteFor(ProfileSource.Saved, profile.id);
</script>

<template>
  <ProfileList
    :title="en.list.savedTitle"
    :source="en.list.savedSource"
    :profiles="savedProfiles.profiles"
    :state="savedProfiles.state"
    :empty-message="en.list.savedEmpty"
    :detail-route="detailRoute"
    :has-more="savedProfiles.hasMore"
    server-filtered
    :countries="savedProfiles.countries"
    @filter-change="onFilterChange"
    @retry="retry"
  >
    <template #footer>
      <StatusMessage v-if="savedProfiles.moreState.status === AsyncStatus.Error" :tone="FeedbackTone.Error">
        {{ en.list.loadMoreFailed }} {{ savedProfiles.moreState.message }}
        <template #action>
          <Button variant="outline" @click="savedProfiles.loadMore">{{ en.list.retry }}</Button>
        </template>
      </StatusMessage>
      <div v-else-if="savedProfiles.hasMore" class="mt-6 flex justify-center">
        <Button
          variant="outline"
          :disabled="savedProfiles.moreState.status === AsyncStatus.Loading"
          @click="savedProfiles.loadMore"
        >
          {{ savedProfiles.moreState.status === AsyncStatus.Loading ? en.list.loadingMore : en.list.showMore }}
        </Button>
      </div>
    </template>
  </ProfileList>
</template>
