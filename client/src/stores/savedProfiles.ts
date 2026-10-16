import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { errorMessage, hasHttpStatus } from '@/api/http';
import {
  createSavedProfile,
  deleteSavedProfile,
  getSavedProfile,
  listSavedProfiles,
  renameSavedProfile,
} from '@/api/profilesApi';
import { HttpStatus } from '@/constants/http';
import type { Profile, ProfileName, SavedProfile } from '@/domain/profile';
import { AsyncStatus, failed, IDLE, LOADING, SUCCESS, type AsyncState } from '@/types/asyncState';

// A list request that overlaps a save/rename/delete may return a snapshot from before it.
const MAX_LOAD_ATTEMPTS = 3;

/**
 * Server state for saved profiles. Mutations are pessimistic: local state changes
 * only after the server confirms, so the UI never shows a profile as saved when it is not.
 */
export const useSavedProfilesStore = defineStore('savedProfiles', () => {
  const profiles = ref<SavedProfile[]>([]);
  const state = shallowRef<AsyncState>(IDLE);
  const profilesById = computed(() => new Map(profiles.value.map((profile) => [profile.id, profile])));

  let pendingLoad: Promise<void> | null = null;
  let mutationVersion = 0;

  function upsert(profile: SavedProfile): void {
    const index = profiles.value.findIndex((existing) => existing.id === profile.id);
    if (index === -1) profiles.value.unshift(profile);
    else profiles.value.splice(index, 1, profile);
  }

  function discard(id: string): void {
    profiles.value = profiles.value.filter((profile) => profile.id !== id);
  }

  function markMutation(): void {
    mutationVersion += 1;
  }

  async function runLoad(): Promise<void> {
    state.value = LOADING;
    try {
      for (let attempt = 1; ; attempt++) {
        const versionAtStart = mutationVersion;
        const fresh = await listSavedProfiles();
        // Refetch rather than overwrite newer local state with a stale snapshot;
        // the cap stops an endless loop if the user keeps mutating.
        if (versionAtStart === mutationVersion || attempt === MAX_LOAD_ATTEMPTS) {
          profiles.value = fresh;
          break;
        }
      }
      state.value = SUCCESS;
    } catch (error) {
      state.value = failed(errorMessage(error));
    }
  }

  /** Concurrent callers share one request instead of racing each other. */
  function load(): Promise<void> {
    pendingLoad ??= runLoad().finally(() => {
      pendingLoad = null;
    });
    return pendingLoad;
  }

  function ensureLoaded(): Promise<void> {
    return state.value.status === AsyncStatus.Idle ? load() : (pendingLoad ?? Promise.resolve());
  }

  function findById(id: string): SavedProfile | undefined {
    return profilesById.value.get(id);
  }

  function isSaved(id: string): boolean {
    return profilesById.value.has(id);
  }

  /** Resolves to null when the backend has no such profile, or the id could never exist (400). */
  async function fetchById(id: string): Promise<SavedProfile | null> {
    const cached = findById(id);
    if (cached) return cached;
    try {
      const profile = await getSavedProfile(id);
      upsert(profile);
      return profile;
    } catch (error) {
      if (hasHttpStatus(error, HttpStatus.NotFound) || hasHttpStatus(error, HttpStatus.BadRequest)) return null;
      throw error;
    }
  }

  async function save(profile: Profile): Promise<SavedProfile> {
    try {
      const saved = await createSavedProfile(profile);
      markMutation();
      upsert(saved);
      return saved;
    } catch (error) {
      // Already saved (another tab, or a retried request whose first response was lost):
      // the user's intent is satisfied, so adopt the stored copy instead of failing.
      if (!hasHttpStatus(error, HttpStatus.Conflict)) throw error;
      const existing = await getSavedProfile(profile.id);
      markMutation();
      upsert(existing);
      return existing;
    }
  }

  async function rename(id: string, name: ProfileName): Promise<SavedProfile> {
    try {
      const updated = await renameSavedProfile(id, name);
      markMutation();
      upsert(updated);
      return updated;
    } catch (error) {
      // Deleted elsewhere: drop the stale copy, and let the caller tell the user.
      if (hasHttpStatus(error, HttpStatus.NotFound)) {
        markMutation();
        discard(id);
      }
      throw error;
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      await deleteSavedProfile(id);
    } catch (error) {
      // Deleting something already gone is a success from the user's point of view.
      if (!hasHttpStatus(error, HttpStatus.NotFound)) throw error;
    }
    markMutation();
    discard(id);
  }

  return { profiles, state, load, ensureLoaded, findById, isSaved, fetchById, save, rename, remove };
});
