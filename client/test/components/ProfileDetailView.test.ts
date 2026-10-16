import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { ApiError } from '@/api/http';
import * as profilesApi from '@/api/profilesApi';
import { he } from '@/i18n/he';
import { parseProfileSource, ProfileSource, RouteName } from '@/router/routeNames';
import { useRandomProfilesStore } from '@/stores/randomProfiles';
import { SUCCESS } from '@/types/asyncState';
import ProfileDetailView from '@/views/ProfileDetailView.vue';
import { buildProfile, buildSavedProfile } from '../fixtures/profiles';

vi.mock('@/api/profilesApi');
const api = vi.mocked(profilesApi);

const Stub = { template: '<div />' };

async function mountDetail(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/random', name: RouteName.RandomList, component: Stub },
      { path: '/saved', name: RouteName.SavedList, component: Stub },
      {
        path: '/:source(random|saved)/:id',
        name: RouteName.ProfileDetail,
        component: ProfileDetailView,
        props: (route) => ({
          source: parseProfileSource(String(route.params.source)),
          id: route.params.id,
        }),
      },
    ],
  });
  await router.push(path);
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

function buttonLabels(wrapper: Awaited<ReturnType<typeof mountDetail>>['wrapper']): string[] {
  return wrapper.findAll('.actions button').map((button) => button.text().trim());
}

function buttonByLabel(wrapper: Awaited<ReturnType<typeof mountDetail>>['wrapper'], label: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === label);
  if (!button) throw new Error(`No button labelled "${label}"`);
  return button;
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
  api.listSavedProfiles.mockResolvedValue([]);
});

describe('ProfileDetailView', () => {
  it('offers Save (not Delete) for an unsaved random profile', async () => {
    const randomStore = useRandomProfilesStore();
    randomStore.profiles = [buildProfile()];
    randomStore.state = SUCCESS;

    const { wrapper } = await mountDetail(`/random/${buildProfile().id}`);

    expect(buttonLabels(wrapper)).toEqual([he.actions.save, he.actions.update, he.actions.back]);
  });

  it('offers Delete (not Save) for a saved profile loaded from the backend', async () => {
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());

    const { wrapper } = await mountDetail(`/saved/${buildSavedProfile().id}`);

    expect(buttonLabels(wrapper)).toEqual([he.actions.update, he.actions.delete, he.actions.back]);
  });

  it('renders an RTL Hebrew layout while keeping LTR data isolated', async () => {
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());

    const { wrapper } = await mountDetail(`/saved/${buildSavedProfile().id}`);

    const article = wrapper.get('article');
    expect(article.attributes('dir')).toBe('rtl');
    expect(article.attributes('lang')).toBe('he');
    expect(wrapper.text()).toContain(he.labels.gender);
    for (const input of wrapper.findAll('input')) {
      expect(input.attributes('dir')).toBe('auto');
    }
    expect(wrapper.get('a[href^="tel:"]').attributes('dir')).toBe('ltr');
    expect(wrapper.get('a[href^="mailto:"]').attributes('dir')).toBe('ltr');
  });

  it('updates an unsaved profile in memory without calling the backend', async () => {
    const randomStore = useRandomProfilesStore();
    randomStore.profiles = [buildProfile()];
    randomStore.state = SUCCESS;
    const { wrapper } = await mountDetail(`/random/${buildProfile().id}`);

    await wrapper.findAll('input')[1]?.setValue('Johnny');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(randomStore.profiles[0]?.name.first).toBe('Johnny');
    expect(api.renameSavedProfile).not.toHaveBeenCalled();
  });

  it('saves to the backend and switches the URL to the saved route', async () => {
    const randomStore = useRandomProfilesStore();
    randomStore.profiles = [buildProfile()];
    randomStore.state = SUCCESS;
    api.createSavedProfile.mockResolvedValue(buildSavedProfile());
    const { wrapper, router } = await mountDetail(`/random/${buildProfile().id}`);

    await buttonByLabel(wrapper, he.actions.save).trigger('click');
    await flushPromises();

    expect(api.createSavedProfile).toHaveBeenCalledWith(buildProfile());
    expect(router.currentRoute.value.params.source).toBe(ProfileSource.Saved);
    expect(buttonLabels(wrapper)).toContain(he.actions.delete);
  });

  it('shows the stored name when Save finds the profile already saved elsewhere (409)', async () => {
    const randomStore = useRandomProfilesStore();
    randomStore.profiles = [buildProfile()];
    randomStore.state = SUCCESS;
    api.createSavedProfile.mockRejectedValue(new ApiError('exists', 409));
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());
    const { wrapper } = await mountDetail(`/random/${buildProfile().id}`);

    await wrapper.findAll('input')[1]?.setValue('Johnny');
    await buttonByLabel(wrapper, he.actions.save).trigger('click');
    await flushPromises();

    expect(wrapper.findAll('input')[1]?.element.value).toBe('John');
    expect(randomStore.profiles[0]?.name.first).toBe('John');
    expect(wrapper.text()).toContain(he.feedback.alreadySaved);
  });

  it('explains that a random profile is gone after a reload', async () => {
    api.getSavedProfile.mockRejectedValue(new ApiError('nf', 404));

    const { wrapper } = await mountDetail('/random/unknown-id');

    expect(wrapper.text()).toContain(he.notFound.random);
  });
});
