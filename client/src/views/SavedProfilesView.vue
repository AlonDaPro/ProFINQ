<script setup lang="ts">
import { onMounted } from 'vue';
import ProfileListPage from '@/components/profile/list/ProfileListPage.vue';
import type { SavedProfile } from '@/domain/profile';
import { en } from '@/i18n/en';
import { detailRouteFor, ProfileSource } from '@/router/routeNames';
import { useSavedProfilesStore } from '@/stores/savedProfiles';

const savedProfiles = useSavedProfilesStore();

// Always refresh on entry: the database is the source of truth and may have
// changed in another tab. Cached rows stay visible while the request runs.
onMounted(() => void savedProfiles.load());

const detailRoute = (profile: SavedProfile) => detailRouteFor(ProfileSource.Saved, profile.id);
</script>

<template>
  <ProfileListPage
    :title="en.list.savedTitle"
    :source="en.list.savedSource"
    :profiles="savedProfiles.profiles"
    :state="savedProfiles.state"
    :empty-message="en.list.savedEmpty"
    :detail-route="detailRoute"
    @retry="savedProfiles.load"
  />
</template>
