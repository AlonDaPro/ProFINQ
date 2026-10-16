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
  /** Bumped by every confirmed save, update or delete. */
  let mutationVersion = 0;
  /** The mutationVersion of the last change to each id, so an older answer cannot undo it. */
  const mutatedAt = new Map<string, number>();
  /** Bumped whenever the list is replaced, so a "Show more" page for the old list is dropped. */
  let listGeneration = 0;

  function markMutated(id: string): void {
    mutationVersion += 1;
    mutatedAt.set(id, mutationVersion);
  }

  function changedSince(id: string, version: number): boolean {
    return (mutatedAt.get(id) ?? 0) > version;
  }

  function remember(profile: SavedProfile): void {
    byId.value.set(profile.id, profile);
  }

  /** Newest first, like the server: by savedAt, then id. */
  function isOlder(a: SavedProfile, b: SavedProfile): boolean {
    return a.savedAt < b.savedAt || (a.savedAt === b.savedAt && a.id < b.id);
  }

  /**
   * Takes a fresh first page. Rows already paged in beyond it stay (returning to History keeps its
   * length and scroll position); listed rows that should be on the first page but are not were
   * deleted elsewhere and go.
   */
  function replaceFirstPage(page: SavedProfile[], pageCursor: string | null): void {
    const firstPageIds = page.map((profile) => profile.id);
    const boundary = page.at(-1);
    const beyond =
      pageCursor && boundary
        ? listIds.value.filter((id) => {
            const profile = byId.value.get(id);
            return profile !== undefined && !firstPageIds.includes(id) && isOlder(profile, boundary);
          })
        : [];
    page.forEach(remember);
    listIds.value = [...firstPageIds, ...beyond];
    if (beyond.length === 0) nextCursor.value = pageCursor;
    listGeneration += 1;
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
          replaceFirstPage(page.profiles, page.nextCursor);
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
    const generation = listGeneration;
    try {
      const page = await listSavedProfiles(cursor);
      // The list was reloaded meanwhile: this page continues a list that is gone.
      if (generation !== listGeneration) return;
      page.profiles.forEach(remember);
      // A profile saved in this session may already be listed at the top: skip it.
      const listed = new Set(listIds.value);
      listIds.value = [...listIds.value, ...page.profiles.map((profile) => profile.id).filter((id) => !listed.has(id))];
      nextCursor.value = page.nextCursor;
      moreState.value = SUCCESS;
    } catch (error) {
      if (generation === listGeneration) moreState.value = failed(errorMessage(error));
    }
  }

  /** Learns which of `ids` are saved, in one request, whatever pages are loaded. */
  async function lookup(ids: readonly string[]): Promise<void> {
    const versionAtStart = mutationVersion;
    const found = await findSavedProfiles(ids);
    // A save, update or delete confirmed while this was in flight is newer than the answer.
    const current = ids.filter((id) => !changedSince(id, versionAtStart));
    const foundById = new Map(found.map((profile) => [profile.id, profile]));
    for (const id of current) {
      const profile = foundById.get(id);
      // Anything not returned is not saved (any more), even if an older copy was cached.
      if (profile) remember(profile);
      else if (byId.value.has(id)) forget(id);
    }
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
      markMutated(saved.id);
      addToList(saved);
      return saved;
    } catch (error) {
      // Already saved (another tab, or a retried request whose first response was lost):
      // the user's intent is satisfied, so adopt the stored copy instead of failing.
      if (!hasHttpStatus(error, HttpStatus.Conflict)) throw error;
      const existing = await getSavedProfile(profile.id);
      markMutated(existing.id);
      addToList(existing);
      return existing;
    }
  }

  async function update(id: string, details: ProfileDetails): Promise<SavedProfile> {
    try {
      const updated = await updateSavedProfile(id, details);
      markMutated(id);
      remember(updated);
      return updated;
    } catch (error) {
      // Deleted elsewhere: drop the stale copy, and let the caller tell the user.
      if (hasHttpStatus(error, HttpStatus.NotFound)) {
        markMutated(id);
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
    markMutated(id);
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
