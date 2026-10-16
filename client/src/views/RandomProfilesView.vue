<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import ProfileList from '@/components/profile/list/ProfileList.vue';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/domain/profile';
import { en } from '@/i18n/en';
import { detailRouteFor, ProfileSource } from '@/router/routeNames';
import { useRandomProfilesStore } from '@/stores/randomProfiles';
import { useSavedProfilesStore } from '@/stores/savedProfiles';
import { AsyncStatus } from '@/types/asyncState';

const randomProfiles = useRandomProfilesStore();
const savedProfiles = useSavedProfilesStore();

onMounted(() => {
  // Only fetch when there is no batch yet (direct visit or reload). Coming back
  // from the detail screen must keep the current batch and its in-memory edits.
  if (randomProfiles.state.status === AsyncStatus.Idle) void randomProfiles.fetchBatch();
});

// Ask the server which people in this batch are already saved: one request for the whole
// batch, however many saved profiles exist. Non-fatal: the list works without the badges.
const batchIds = computed(() => randomProfiles.profiles.map((profile) => profile.id));
watch(
  batchIds,
  (ids) => {
    if (ids.length > 0) savedProfiles.lookup(ids).catch(() => undefined);
  },
  { immediate: true },
);

const isSaved = (profile: Profile) => savedProfiles.isSaved(profile.id);
// Already-saved people open in "saved" mode, so the detail screen offers Delete, not Save.
const detailRoute = (profile: Profile) =>
  detailRouteFor(isSaved(profile) ? ProfileSource.Saved : ProfileSource.Random, profile.id);
</script>

<template>
  <ProfileList
    :title="en.list.randomTitle"
    :source="en.list.randomSource"
    :profiles="randomProfiles.profiles"
    :state="randomProfiles.state"
    :empty-message="en.list.randomEmpty"
    :detail-route="detailRoute"
    :is-saved="isSaved"
    @retry="randomProfiles.fetchBatch"
  >
    <template #actions>
      <Button :disabled="randomProfiles.state.status === AsyncStatus.Loading" @click="randomProfiles.fetchBatch">{{
        en.list.fetchNewBatch
      }}</Button>
    </template>
  </ProfileList>
</template>
