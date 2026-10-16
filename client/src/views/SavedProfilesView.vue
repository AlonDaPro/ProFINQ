<script setup lang="ts">
import { onMounted } from 'vue';
import StatusMessage from '@/components/common/StatusMessage.vue';
import ProfileList from '@/components/profile/list/ProfileList.vue';
import { Button } from '@/components/ui/button';
import type { SavedProfile } from '@/domain/profile';
import { en } from '@/i18n/en';
import { detailRouteFor, ProfileSource } from '@/router/routeNames';
import { useSavedProfilesStore } from '@/stores/savedProfiles';
import { AsyncStatus } from '@/types/asyncState';
import { FeedbackTone } from '@/types/feedback';

const savedProfiles = useSavedProfilesStore();

// Always refresh on entry: the database is the source of truth and may have changed in
// another tab. Rows already loaded stay visible while the request runs.
onMounted(() => void savedProfiles.load());

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
    @retry="savedProfiles.load"
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
