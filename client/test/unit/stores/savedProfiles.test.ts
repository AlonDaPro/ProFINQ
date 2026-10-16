import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as profilesApi from '@/api/profilesApi';
import type { SavedProfile } from '@/domain/profile';
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

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

describe('saved profiles store', () => {
  it('shares one request between concurrent loads', async () => {
    api.listSavedProfiles.mockResolvedValue([buildSavedProfile()]);
    const store = useSavedProfilesStore();

    await Promise.all([store.load(), store.load(), store.ensureLoaded()]);

    expect(api.listSavedProfiles).toHaveBeenCalledTimes(1);
    expect(store.state.status).toBe(AsyncStatus.Success);
  });

  it('does not let a stale list response erase a profile saved while it was in flight', async () => {
    const staleList = deferred<SavedProfile[]>();
    const saved = buildSavedProfile({ id: 'new-one' });
    api.listSavedProfiles.mockReturnValueOnce(staleList.promise).mockResolvedValueOnce([saved]);
    api.createSavedProfile.mockResolvedValue(saved);
    const store = useSavedProfilesStore();

    const loading = store.load();
    await store.save(buildProfile({ id: 'new-one' }));
    staleList.resolve([]);
    await loading;

    expect(store.isSaved('new-one')).toBe(true);
    expect(api.listSavedProfiles).toHaveBeenCalledTimes(2);
  });

  it('treats "already saved" (409) as success and adopts the stored copy', async () => {
    const stored = buildSavedProfile({ name: { title: 'Mr', first: 'Stored', last: 'Copy' } });
    api.createSavedProfile.mockRejectedValue(new ApiError('exists', 409));
    api.getSavedProfile.mockResolvedValue(stored);
    const store = useSavedProfilesStore();

    await expect(store.save(buildProfile())).resolves.toEqual(stored);
    expect(store.findById(stored.id)?.name.first).toBe('Stored');
  });

  it('treats an id the API rejects as malformed (400) as not found', async () => {
    api.getSavedProfile.mockRejectedValue(new ApiError('Request validation failed', 400));
    const store = useSavedProfilesStore();

    await expect(store.fetchById('abc.def')).resolves.toBeNull();
  });

  it('treats deleting an already-deleted profile (404) as success', async () => {
    api.listSavedProfiles.mockResolvedValue([buildSavedProfile()]);
    api.deleteSavedProfile.mockRejectedValue(new ApiError('gone', 404));
    const store = useSavedProfilesStore();
    await store.load();

    await store.remove(buildSavedProfile().id);

    expect(store.profiles).toEqual([]);
  });

  it('keeps local state unchanged when the server rejects a rename', async () => {
    const original = buildSavedProfile();
    api.listSavedProfiles.mockResolvedValue([original]);
    api.renameSavedProfile.mockRejectedValue(new ApiError('down', 503));
    const store = useSavedProfilesStore();
    await store.load();

    await expect(store.rename(original.id, { title: 'Dr', first: 'X', last: 'Y' })).rejects.toThrow('down');

    expect(store.findById(original.id)?.name).toEqual(original.name);
  });

  it('surfaces load failures as an error state', async () => {
    api.listSavedProfiles.mockRejectedValue(new ApiError('Could not reach the server.'));
    const store = useSavedProfilesStore();

    await store.load();

    expect(store.state).toEqual({ status: AsyncStatus.Error, message: 'Could not reach the server.' });
  });
});
