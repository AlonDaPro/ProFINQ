import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as profilesApi from '@/api/profilesApi';
import { pickDetails, type SavedProfile } from '@/domain/profile';
import { EMPTY_FILTER } from '@/domain/filter/profileFilter';
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

    expect(api.listSavedProfiles).toHaveBeenLastCalledWith(EMPTY_FILTER, 'cursor-1');
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

  it('drops a "show more" page that arrives after the list was reloaded', async () => {
    const latePage = deferred<ReturnType<typeof page>>();
    api.listSavedProfiles
      .mockResolvedValueOnce(page([first], 'cursor-1'))
      .mockReturnValueOnce(latePage.promise)
      .mockResolvedValueOnce(page([second]));
    const store = useSavedProfilesStore();
    await store.load();

    const loadingMore = store.loadMore();
    await store.load();
    latePage.resolve(page([third], 'cursor-3'));
    await loadingMore;

    expect(ids(store.profiles)).toEqual(['second']);
    expect(store.hasMore).toBe(false);
  });

  it('keeps rows already paged in when the first page is refreshed, and drops ones deleted elsewhere', async () => {
    const older = buildSavedProfile({ id: 'older', savedAt: '2026-01-01T00:00:00.000Z' });
    const goneMeanwhile = buildSavedProfile({ id: 'gone', savedAt: '2026-03-01T00:00:00.000Z' });
    const newest = buildSavedProfile({ id: 'newest', savedAt: '2026-04-01T00:00:00.000Z' });
    const middle = buildSavedProfile({ id: 'middle', savedAt: '2026-02-01T00:00:00.000Z' });
    api.listSavedProfiles
      .mockResolvedValueOnce(page([newest, goneMeanwhile], 'cursor-1'))
      .mockResolvedValueOnce(page([middle, older]))
      .mockResolvedValueOnce(page([newest, middle], 'cursor-2'));
    const store = useSavedProfilesStore();
    await store.load();
    await store.loadMore();

    await store.load();

    expect(ids(store.profiles)).toEqual(['newest', 'middle', 'older']);
    expect(store.hasMore).toBe(false);
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

  it('does not let an answer from before a save undo it', async () => {
    const lateLookup = deferred<SavedProfile[]>();
    api.findSavedProfiles.mockReturnValueOnce(lateLookup.promise);
    api.createSavedProfile.mockResolvedValue(first);
    const store = useSavedProfilesStore();

    const looking = store.lookup(['first']);
    await store.save(buildProfile({ id: 'first' }));
    lateLookup.resolve([]);
    await looking;

    expect(store.isSaved('first')).toBe(true);
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

describe('saved profiles store: server-side filter', () => {
  const spain = { name: '', country: 'Spain' };

  it('loads the list for a filter, and again when the filter changes', async () => {
    api.listSavedProfiles.mockResolvedValueOnce(page([first])).mockResolvedValueOnce(page([second]));
    const store = useSavedProfilesStore();

    await store.load(spain);
    await store.ensureLoaded(EMPTY_FILTER);

    expect(api.listSavedProfiles).toHaveBeenNthCalledWith(1, spain);
    expect(api.listSavedProfiles).toHaveBeenNthCalledWith(2, EMPTY_FILTER);
    expect(ids(store.profiles)).toEqual(['second']);
  });

  it('applies only the latest filter when answers arrive out of order', async () => {
    const slow = deferred<ReturnType<typeof page>>();
    api.listSavedProfiles.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(page([second]));
    const store = useSavedProfilesStore();

    const older = store.load({ name: 'jo', country: '' });
    await store.load({ name: 'john', country: '' });
    slow.resolve(page([first]));
    await older;

    expect(ids(store.profiles)).toEqual(['second']);
  });

  it('does not put a new save into a filtered list it may not match', async () => {
    api.listSavedProfiles.mockResolvedValue(page([first]));
    api.createSavedProfile.mockResolvedValue(second);
    const store = useSavedProfilesStore();
    await store.load(spain);

    await store.save(buildProfile({ id: 'second' }));

    expect(ids(store.profiles)).toEqual(['first']);
    expect(store.isSaved('second')).toBe(true);
  });
});
