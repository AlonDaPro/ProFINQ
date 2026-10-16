import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as profilesApi from '@/api/profilesApi';
import { pickDetails, type SavedProfile } from '@/domain/profile';
import { useSavedProfilesStore } from '@/stores/savedProfiles';
import { AsyncStatus } from '@/types/asyncState';
import { buildProfile, buildSavedProfile } from '../../fixtures/profiles';

vi.mock('@/api/profilesApi');
const api = vi.mocked(profilesApi);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const page = (profiles: SavedProfile[], nextCursor: string | null = null) => ({ profiles, nextCursor });
const ids = (profiles: readonly SavedProfile[]) => profiles.map((profile) => profile.id);

const first = buildSavedProfile({ id: 'first' });
const second = buildSavedProfile({ id: 'second' });
const third = buildSavedProfile({ id: 'third' });

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

describe('saved profiles store: loading', () => {
  it('shares one request between concurrent loads', async () => {
    api.listSavedProfiles.mockResolvedValue(page([first]));
    const store = useSavedProfilesStore();

    await Promise.all([store.load(), store.load(), store.ensureLoaded()]);

    expect(api.listSavedProfiles).toHaveBeenCalledTimes(1);
    expect(store.state.status).toBe(AsyncStatus.Success);
  });

  it('surfaces load failures as an error state', async () => {
    api.listSavedProfiles.mockRejectedValue(new ApiError('Could not reach the server.'));
    const store = useSavedProfilesStore();

    await store.load();

    expect(store.state).toEqual({ status: AsyncStatus.Error, message: 'Could not reach the server.' });
  });

  it('retries on ensureLoaded after a failed load', async () => {
    api.listSavedProfiles.mockRejectedValueOnce(new ApiError('down')).mockResolvedValueOnce(page([first]));
    const store = useSavedProfilesStore();
    await store.ensureLoaded();

    await store.ensureLoaded();

    expect(api.listSavedProfiles).toHaveBeenCalledTimes(2);
    expect(ids(store.profiles)).toEqual(['first']);
  });

  it('does not let a stale first page erase a profile saved while it was in flight', async () => {
    const stalePage = deferred<ReturnType<typeof page>>();
    const saved = buildSavedProfile({ id: 'new-one' });
    api.listSavedProfiles.mockReturnValueOnce(stalePage.promise).mockResolvedValueOnce(page([saved]));
    api.createSavedProfile.mockResolvedValue(saved);
    const store = useSavedProfilesStore();

    const loading = store.load();
    await store.save(buildProfile({ id: 'new-one' }));
    stalePage.resolve(page([]));
    await loading;

    expect(store.isSaved('new-one')).toBe(true);
    expect(api.listSavedProfiles).toHaveBeenCalledTimes(2);
  });
});

describe('saved profiles store: pagination', () => {
  it('appends the next page and remembers whether more exist', async () => {
    api.listSavedProfiles.mockResolvedValueOnce(page([first], 'cursor-1')).mockResolvedValueOnce(page([second]));
    const store = useSavedProfilesStore();
    await store.load();
    expect(store.hasMore).toBe(true);

    await store.loadMore();

    expect(api.listSavedProfiles).toHaveBeenLastCalledWith('cursor-1');
    expect(ids(store.profiles)).toEqual(['first', 'second']);
    expect(store.hasMore).toBe(false);
  });

  it('does nothing when there is no next page', async () => {
    api.listSavedProfiles.mockResolvedValue(page([first]));
    const store = useSavedProfilesStore();
    await store.load();

    await store.loadMore();

    expect(api.listSavedProfiles).toHaveBeenCalledTimes(1);
  });

  it('ignores a second "show more" while one is in flight', async () => {
    const nextPage = deferred<ReturnType<typeof page>>();
    api.listSavedProfiles.mockResolvedValueOnce(page([first], 'cursor-1')).mockReturnValueOnce(nextPage.promise);
    const store = useSavedProfilesStore();
    await store.load();

    const loading = store.loadMore();
    await store.loadMore();
    nextPage.resolve(page([second]));
    await loading;

    expect(api.listSavedProfiles).toHaveBeenCalledTimes(2);
  });

  it('skips a row already listed because it was saved during this session', async () => {
    api.listSavedProfiles.mockResolvedValueOnce(page([first], 'cursor-1')).mockResolvedValueOnce(page([third, second]));
    api.createSavedProfile.mockResolvedValue(third);
    const store = useSavedProfilesStore();
    await store.load();
    await store.save(buildProfile({ id: 'third' }));

    await store.loadMore();

    expect(ids(store.profiles)).toEqual(['third', 'first', 'second']);
  });

  it('keeps the loaded rows and reports the error when a page fails', async () => {
    api.listSavedProfiles.mockResolvedValueOnce(page([first], 'cursor-1')).mockRejectedValueOnce(new ApiError('down'));
    const store = useSavedProfilesStore();
    await store.load();

    await store.loadMore();

    expect(ids(store.profiles)).toEqual(['first']);
    expect(store.moreState.status).toBe(AsyncStatus.Error);
    expect(store.hasMore).toBe(true);
  });
});

describe('saved profiles store: lookup', () => {
  it('marks the requested ids that are saved, in one request', async () => {
    api.findSavedProfiles.mockResolvedValue([second]);
    const store = useSavedProfilesStore();

    await store.lookup(['first', 'second']);

    expect(api.findSavedProfiles).toHaveBeenCalledWith(['first', 'second']);
    expect(store.isSaved('second')).toBe(true);
    expect(store.isSaved('first')).toBe(false);
  });

  it('forgets a cached profile that the server no longer has', async () => {
    api.listSavedProfiles.mockResolvedValue(page([first]));
    api.findSavedProfiles.mockResolvedValue([]);
    const store = useSavedProfilesStore();
    await store.load();

    await store.lookup(['first']);

    expect(store.isSaved('first')).toBe(false);
    expect(store.profiles).toEqual([]);
  });
});

describe('saved profiles store: mutations', () => {
  it('treats "already saved" (409) as success and adopts the stored copy', async () => {
    const stored = buildSavedProfile({ name: { title: '', first: 'Stored', last: 'Copy' } });
    api.createSavedProfile.mockRejectedValue(new ApiError('exists', 409));
    api.getSavedProfile.mockResolvedValue(stored);
    const store = useSavedProfilesStore();

    await expect(store.save(buildProfile())).resolves.toEqual(stored);
    expect(store.findById(stored.id)?.name.first).toBe('Stored');
  });

  it('puts a newly saved profile at the top of a loaded list', async () => {
    api.listSavedProfiles.mockResolvedValue(page([first]));
    api.createSavedProfile.mockResolvedValue(second);
    const store = useSavedProfilesStore();
    await store.load();

    await store.save(buildProfile({ id: 'second' }));

    expect(ids(store.profiles)).toEqual(['second', 'first']);
  });

  it('replaces the cached copy with the server response on update', async () => {
    const updated = buildSavedProfile({ id: 'first', email: 'new@example.com' });
    api.listSavedProfiles.mockResolvedValue(page([first]));
    api.updateSavedProfile.mockResolvedValue(updated);
    const store = useSavedProfilesStore();
    await store.load();

    await store.update('first', pickDetails(updated));

    expect(api.updateSavedProfile).toHaveBeenCalledWith('first', pickDetails(updated));
    expect(store.findById('first')?.email).toBe('new@example.com');
  });

  it('keeps local state unchanged when the server rejects an update', async () => {
    api.listSavedProfiles.mockResolvedValue(page([first]));
    api.updateSavedProfile.mockRejectedValue(new ApiError('down', 503));
    const store = useSavedProfilesStore();
    await store.load();

    await expect(store.update('first', pickDetails(second))).rejects.toThrow('down');

    expect(store.findById('first')).toEqual(first);
  });

  it('drops the profile when an update finds it deleted elsewhere (404), and rethrows', async () => {
    api.listSavedProfiles.mockResolvedValue(page([first]));
    api.updateSavedProfile.mockRejectedValue(new ApiError('gone', 404));
    const store = useSavedProfilesStore();
    await store.load();

    await expect(store.update('first', pickDetails(first))).rejects.toBeInstanceOf(ApiError);

    expect(store.isSaved('first')).toBe(false);
  });

  it('treats deleting an already-deleted profile (404) as success', async () => {
    api.listSavedProfiles.mockResolvedValue(page([first]));
    api.deleteSavedProfile.mockRejectedValue(new ApiError('gone', 404));
    const store = useSavedProfilesStore();
    await store.load();

    await store.remove('first');

    expect(store.profiles).toEqual([]);
  });

  it('treats an id the API rejects as malformed (400) as not found', async () => {
    api.getSavedProfile.mockRejectedValue(new ApiError('Request validation failed', 400));
    const store = useSavedProfilesStore();

    await expect(store.fetchById('abc.def')).resolves.toBeNull();
  });
});
