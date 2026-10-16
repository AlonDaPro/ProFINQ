import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/http';
import * as randomUserApi from '@/api/randomUser/randomUserApi';
import { pickDetails } from '@/domain/profile';
import { useRandomProfilesStore } from '@/stores/randomProfiles';
import { AsyncStatus } from '@/types/asyncState';
import { buildProfile } from '../../fixtures/profiles';

vi.mock('@/api/randomUser/randomUserApi');
const api = vi.mocked(randomUserApi);

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});

describe('random profiles store', () => {
  it('loads a batch of ten', async () => {
    api.fetchRandomProfiles.mockResolvedValue([buildProfile()]);
    const store = useRandomProfilesStore();

    await store.fetchBatch();

    expect(api.fetchRandomProfiles).toHaveBeenCalledWith(10, expect.any(AbortSignal));
    expect(store.profiles).toEqual([buildProfile()]);
  });

  it('keeps the current batch, and its edits, when fetching a new one fails', async () => {
    api.fetchRandomProfiles.mockResolvedValueOnce([buildProfile()]).mockRejectedValueOnce(new ApiError('down'));
    const store = useRandomProfilesStore();
    await store.fetchBatch();
    store.update(buildProfile().id, { ...pickDetails(buildProfile()), email: 'edited@example.com' });

    await store.fetchBatch();

    expect(store.state.status).toBe(AsyncStatus.Error);
    expect(store.profiles[0]?.email).toBe('edited@example.com');
  });

  it('lets the newest fetch win when an older one answers late', async () => {
    let resolveOld!: (value: ReturnType<typeof buildProfile>[]) => void;
    api.fetchRandomProfiles
      .mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve)))
      .mockResolvedValueOnce([buildProfile({ id: 'new' })]);
    const store = useRandomProfilesStore();

    const old = store.fetchBatch();
    await store.fetchBatch();
    resolveOld([buildProfile({ id: 'old' })]);
    await old;

    expect(store.profiles.map((profile) => profile.id)).toEqual(['new']);
  });

  it('updates every editable field in memory, and reports a profile that is gone', () => {
    const store = useRandomProfilesStore();
    store.profiles = [buildProfile()];
    const edited = { ...pickDetails(buildProfile()), phone: '058-6043122', dateOfBirth: '1985-01-30' };

    expect(store.update(buildProfile().id, edited)).toBe(true);
    expect(store.profiles[0]).toMatchObject(edited);
    expect(store.profiles[0]?.picture).toEqual(buildProfile().picture);
    expect(store.update('missing', edited)).toBe(false);
  });
});
