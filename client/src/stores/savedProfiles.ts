import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { errorMessage, hasHttpStatus } from '@/api/http';
import {
  createSavedProfile,
  deleteSavedProfile,
  findSavedProfiles,
  getSavedProfile,
  listSavedProfiles,
  updateSavedProfile,
} from '@/api/profilesApi';
import { HttpStatus } from '@/constants/http';
import type { Profile, ProfileDetails, SavedProfile } from '@/domain/profile';
import { AsyncStatus, failed, IDLE, LOADING, SUCCESS, type AsyncState } from '@/types/asyncState';

// A first-page request that overlaps a save or delete may return a snapshot from before it.
const MAX_LOAD_ATTEMPTS = 3;

/**
 * Server state for saved profiles: a cache by id (answers "is this saved?" for any id) plus the
 * History list, loaded page by page. Mutations are pessimistic: local state changes only after
 * the server confirms, so the UI never shows a profile as saved when it is not.
 */
export const useSavedProfilesStore = defineStore('savedProfiles', () => {
  const byId = ref(new Map<string, SavedProfile>());
  const listIds = ref<string[]>([]);
  const nextCursor = ref<string | null>(null);
  /** The first page (also the state shown by History). */
  const state = shallowRef<AsyncState>(IDLE);
  /** "Show more" requests. */
  const moreState = shallowRef<AsyncState>(IDLE);

  const profiles = computed(() =>
    listIds.value.flatMap((id) => {
      const profile = byId.value.get(id);
      return profile ? [profile] : [];
    }),
  );
  const hasMore = computed(() => nextCursor.value !== null);

  let pendingLoad: Promise<void> | null = null;
  let mutationVersion = 0;

  function remember(profile: SavedProfile): void {
    byId.value.set(profile.id, profile);
  }

  function forget(id: string): void {
    byId.value.delete(id);
    listIds.value = listIds.value.filter((listedId) => listedId !== id);
  }

  async function runLoad(): Promise<void> {
    state.value = LOADING;
    try {
      for (let attempt = 1; ; attempt++) {
        const versionAtStart = mutationVersion;
        const page = await listSavedProfiles();
        // Refetch rather than overwrite newer local state with a stale snapshot; capped in case
        // the user keeps mutating.
        if (versionAtStart === mutationVersion || attempt === MAX_LOAD_ATTEMPTS) {
          page.profiles.forEach(remember);
          listIds.value = page.profiles.map((profile) => profile.id);
          nextCursor.value = page.nextCursor;
          break;
        }
      }
      state.value = SUCCESS;
      moreState.value = IDLE;
    } catch (error) {
      state.value = failed(errorMessage(error));
    }
  }

  /** (Re)loads the first page. Concurrent callers share one request. */
  function load(): Promise<void> {
    pendingLoad ??= runLoad().finally(() => {
      pendingLoad = null;
    });
    return pendingLoad;
  }

  /** Loads the first page unless it is already there; retries after a failure. */
  function ensureLoaded(): Promise<void> {
    if (state.value.status === AsyncStatus.Idle || state.value.status === AsyncStatus.Error) return load();
    return pendingLoad ?? Promise.resolve();
  }

  async function loadMore(): Promise<void> {
    const cursor = nextCursor.value;
    if (!cursor || moreState.value.status === AsyncStatus.Loading) return;
    moreState.value = LOADING;
    try {
      const page = await listSavedProfiles(cursor);
      page.profiles.forEach(remember);
      // A profile saved in this session may already be listed at the top: skip it.
      const listed = new Set(listIds.value);
      listIds.value = [...listIds.value, ...page.profiles.map((profile) => profile.id).filter((id) => !listed.has(id))];
      nextCursor.value = page.nextCursor;
      moreState.value = SUCCESS;
    } catch (error) {
      moreState.value = failed(errorMessage(error));
    }
  }

  /** Learns which of `ids` are saved, in one request, whatever pages are loaded. */
  async function lookup(ids: readonly string[]): Promise<void> {
    const found = await findSavedProfiles(ids);
    found.forEach(remember);
    // Anything not returned is not saved (any more), even if an older copy was cached.
    const foundIds = new Set(found.map((profile) => profile.id));
    ids.filter((id) => !foundIds.has(id) && byId.value.has(id)).forEach(forget);
  }

  function findById(id: string): SavedProfile | undefined {
    return byId.value.get(id);
  }

  function isSaved(id: string): boolean {
    return byId.value.has(id);
  }

  /** Resolves to null when the backend has no such profile, or the id could never exist (400). */
  async function fetchById(id: string): Promise<SavedProfile | null> {
    const cached = findById(id);
    if (cached) return cached;
    try {
      const profile = await getSavedProfile(id);
      remember(profile);
      return profile;
    } catch (error) {
      if (hasHttpStatus(error, HttpStatus.NotFound) || hasHttpStatus(error, HttpStatus.BadRequest)) return null;
      throw error;
    }
  }

  function addToList(profile: SavedProfile): void {
    remember(profile);
    if (state.value.status === AsyncStatus.Success && !listIds.value.includes(profile.id)) {
      listIds.value = [profile.id, ...listIds.value];
    }
  }

  async function save(profile: Profile): Promise<SavedProfile> {
    try {
      const saved = await createSavedProfile(profile);
      mutationVersion += 1;
      addToList(saved);
      return saved;
    } catch (error) {
      // Already saved (another tab, or a retried request whose first response was lost):
      // the user's intent is satisfied, so adopt the stored copy instead of failing.
      if (!hasHttpStatus(error, HttpStatus.Conflict)) throw error;
      const existing = await getSavedProfile(profile.id);
      mutationVersion += 1;
      addToList(existing);
      return existing;
    }
  }

  async function update(id: string, details: ProfileDetails): Promise<SavedProfile> {
    try {
      const updated = await updateSavedProfile(id, details);
      mutationVersion += 1;
      remember(updated);
      return updated;
    } catch (error) {
      // Deleted elsewhere: drop the stale copy, and let the caller tell the user.
      if (hasHttpStatus(error, HttpStatus.NotFound)) {
        mutationVersion += 1;
        forget(id);
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
    mutationVersion += 1;
    forget(id);
  }

  return {
    profiles,
    state,
    moreState,
    hasMore,
    load,
    ensureLoaded,
    loadMore,
    lookup,
    findById,
    isSaved,
    fetchById,
    save,
    update,
    remove,
  };
});
