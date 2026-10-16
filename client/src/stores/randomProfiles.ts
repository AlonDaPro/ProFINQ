import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { errorMessage } from '@/api/http';
import { fetchRandomProfiles } from '@/api/randomUser/randomUserApi';
import { RANDOM_BATCH_SIZE } from '@/constants/app';
import type { Profile, ProfileDetails } from '@/domain/profile';
import { failed, IDLE, LOADING, SUCCESS, type AsyncState } from '@/types/asyncState';

/**
 * The current random batch lives in a store rather than in the list view because
 * it must outlive navigation: edits made on the detail screen to an unsaved
 * profile have to be visible when the user goes back to the list.
 */
export const useRandomProfilesStore = defineStore('randomProfiles', () => {
  const profiles = ref<Profile[]>([]);
  const state = shallowRef<AsyncState>(IDLE);
  let inFlight: AbortController | null = null;

  async function fetchBatch(): Promise<void> {
    // A newer fetch supersedes an older one; without aborting, a slow earlier
    // response could arrive last and overwrite the batch the user asked for.
    inFlight?.abort();
    const controller = new AbortController();
    inFlight = controller;

    // The current batch stays until the new one arrives: a failed fetch must not wipe it.
    state.value = LOADING;
    try {
      const batch = await fetchRandomProfiles(RANDOM_BATCH_SIZE, controller.signal);
      if (controller.signal.aborted) return;
      profiles.value = batch;
      state.value = SUCCESS;
    } catch (error) {
      if (controller.signal.aborted) return;
      state.value = failed(errorMessage(error));
    } finally {
      if (inFlight === controller) inFlight = null;
    }
  }

  function findById(id: string): Profile | undefined {
    return profiles.value.find((profile) => profile.id === id);
  }

  /** Replaces a profile's editable details in memory. Returns false when it is no longer in the batch. */
  function update(id: string, details: ProfileDetails): boolean {
    const index = profiles.value.findIndex((profile) => profile.id === id);
    const current = profiles.value[index];
    if (!current) return false;
    profiles.value.splice(index, 1, { ...current, ...details });
    return true;
  }

  return { profiles, state, fetchBatch, findById, update };
});
