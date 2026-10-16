import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { ApiError } from '@/api/http';
import * as profilesApi from '@/api/profilesApi';
import { FieldError, FormField, Gender, pickDetails, Title } from '@/domain/profile';
import { he } from '@/i18n/he';
import { parseProfileSource, ProfileSource, RouteName } from '@/router/routeNames';
import { useRandomProfilesStore } from '@/stores/randomProfiles';
import { useSavedProfilesStore } from '@/stores/savedProfiles';
import { SUCCESS } from '@/types/asyncState';
import ProfileDetailView from '@/views/ProfileDetailView.vue';
import { buildProfile, buildSavedProfile } from '../fixtures/profiles';

vi.mock('@/api/profilesApi');
const api = vi.mocked(profilesApi);

// Each test's component is unmounted, so a pending navigation cannot leak into the next test.
enableAutoUnmount(afterEach);

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
        props: (route) => ({ source: parseProfileSource(String(route.params.source)), id: route.params.id }),
      },
    ],
  });
  await router.push(path);
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

function seedRandomBatch() {
  const randomStore = useRandomProfilesStore();
  randomStore.profiles = [buildProfile()];
  randomStore.state = SUCCESS;
  return randomStore;
}

function buttonLabels(wrapper: VueWrapper): string[] {
  return wrapper.findAll('.actions button').map((button) => button.text().trim());
}

function button(wrapper: VueWrapper, label: string) {
  const match = wrapper.findAll('button').find((candidate) => candidate.text().trim() === label);
  if (!match) throw new Error(`No button labelled "${label}"`);
  return match;
}

/** The control a <label> points at, found the way assistive technology finds it. */
function field(wrapper: VueWrapper, name: FormField) {
  const label = wrapper.findAll('label').find((candidate) => candidate.text().startsWith(he.fields[name]));
  if (!label) throw new Error(`No label for ${name}`);
  return wrapper.get(`[id="${label.attributes('for') ?? ''}"]`);
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
  api.findSavedProfiles.mockResolvedValue([]);
});

describe('ProfileDetailView: which actions are offered', () => {
  it('offers Save (not Delete) for an unsaved random profile', async () => {
    seedRandomBatch();

    const { wrapper } = await mountDetail(`/random/${buildProfile().id}`);

    expect(buttonLabels(wrapper)).toEqual([he.actions.save, he.actions.update, he.actions.back]);
  });

  it('offers Delete (not Save) for a saved profile loaded from the backend', async () => {
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());

    const { wrapper } = await mountDetail(`/saved/${buildSavedProfile().id}`);

    expect(buttonLabels(wrapper)).toEqual([he.actions.update, he.actions.delete, he.actions.back]);
  });

  it('switches a random profile to Delete when the server says it is already saved', async () => {
    seedRandomBatch();
    api.findSavedProfiles.mockResolvedValue([buildSavedProfile()]);

    const { wrapper } = await mountDetail(`/random/${buildProfile().id}`);

    expect(api.findSavedProfiles).toHaveBeenCalledWith([buildProfile().id]);
    expect(buttonLabels(wrapper)).toContain(he.actions.delete);
  });

  it('explains that a random profile is gone after a reload', async () => {
    api.getSavedProfile.mockRejectedValue(new ApiError('nf', 404));

    const { wrapper } = await mountDetail('/random/unknown-id');

    expect(wrapper.text()).toContain(he.notFound.random);
  });
});

describe('ProfileDetailView: direction', () => {
  it('renders an RTL Hebrew layout with LTR-only inputs for email, phone, numbers and dates', async () => {
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());

    const { wrapper } = await mountDetail(`/saved/${buildSavedProfile().id}`);

    const article = wrapper.get('article');
    expect(article.attributes('dir')).toBe('rtl');
    expect(article.attributes('lang')).toBe('he');
    for (const name of [FormField.Email, FormField.Phone, FormField.StreetNumber, FormField.DateOfBirth]) {
      expect(field(wrapper, name).attributes('dir')).toBe('ltr');
    }
    for (const name of [FormField.First, FormField.Last, FormField.City]) {
      expect(field(wrapper, name).attributes('dir')).toBe('auto');
    }
  });
});

describe('ProfileDetailView: editing', () => {
  it('fills every field from the profile', async () => {
    seedRandomBatch();

    const { wrapper } = await mountDetail(`/random/${buildProfile().id}`);

    const profile = buildProfile();
    expect((field(wrapper, FormField.First).element as HTMLInputElement).value).toBe(profile.name.first);
    expect((field(wrapper, FormField.Gender).element as HTMLSelectElement).value).toBe(profile.gender);
    expect((field(wrapper, FormField.DateOfBirth).element as HTMLInputElement).value).toBe(profile.dateOfBirth);
    expect((field(wrapper, FormField.StreetNumber).element as HTMLInputElement).value).toBe(
      String(profile.location.streetNumber),
    );
  });

  it('updates an unsaved profile in memory, with every field and typed values, without the backend', async () => {
    const randomStore = seedRandomBatch();
    const { wrapper } = await mountDetail(`/random/${buildProfile().id}`);

    await field(wrapper, FormField.First).setValue('Johnny');
    await field(wrapper, FormField.Gender).setValue(Gender.Female);
    await field(wrapper, FormField.StreetNumber).setValue('42');
    await field(wrapper, FormField.Email).setValue('johnny@example.com');
    await field(wrapper, FormField.DateOfBirth).setValue('1985-01-30');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(randomStore.profiles[0]).toMatchObject({
      name: { first: 'Johnny' },
      gender: Gender.Female,
      email: 'johnny@example.com',
      location: { streetNumber: 42 },
      dateOfBirth: '1985-01-30',
    });
    expect(api.updateSavedProfile).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(he.feedback.updatedLocal);
  });

  it('sends the complete, typed details when a saved profile is updated', async () => {
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());
    api.updateSavedProfile.mockResolvedValue(buildSavedProfile({ phone: '058-6043122' }));
    const { wrapper } = await mountDetail(`/saved/${buildSavedProfile().id}`);

    await field(wrapper, FormField.Phone).setValue('058-6043122');
    await button(wrapper, he.actions.update).trigger('click');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.updateSavedProfile).toHaveBeenCalledWith(buildSavedProfile().id, {
      ...pickDetails(buildSavedProfile()),
      phone: '058-6043122',
    });
    expect(wrapper.text()).toContain(he.feedback.updatedSaved);
  });
});

describe('ProfileDetailView: validation', () => {
  it.each([
    [FormField.First, 'J0hn', FieldError.InvalidName],
    [FormField.Email, 'not-an-email', FieldError.InvalidEmail],
    [FormField.Phone, '12', FieldError.InvalidPhone],
    [FormField.StreetNumber, '12b', FieldError.NotWholeNumber],
    [FormField.DateOfBirth, '2999-01-01', FieldError.FutureDate],
  ])('shows a Hebrew error under %s and blocks both Save and Update', async (name, value, error) => {
    seedRandomBatch();
    const { wrapper } = await mountDetail(`/random/${buildProfile().id}`);

    const input = field(wrapper, name);
    await input.setValue(value);

    expect(input.attributes('aria-invalid')).toBe('true');
    const message = wrapper.get(`[id="${input.attributes('aria-describedby') ?? ''}"]`);
    expect(message.text()).toBe(he.errors[error]());
    expect(button(wrapper, he.actions.save).attributes('disabled')).toBeDefined();
    expect(button(wrapper, he.actions.update).attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain(he.feedback.invalidForm(1));
  });

  it('does not call the backend when the form is submitted while invalid', async () => {
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());
    const { wrapper } = await mountDetail(`/saved/${buildSavedProfile().id}`);

    await field(wrapper, FormField.City).setValue('');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.updateSavedProfile).not.toHaveBeenCalled();
  });

  it('shows no errors on fields the user has not touched', async () => {
    seedRandomBatch();

    const { wrapper } = await mountDetail(`/random/${buildProfile().id}`);

    expect(wrapper.findAll('[aria-invalid="true"]')).toHaveLength(0);
  });

  it('puts the server’s field errors under the matching inputs', async () => {
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());
    api.updateSavedProfile.mockRejectedValue(
      new ApiError('Request validation failed', 400, [{ path: 'body.email', message: 'Invalid email' }]),
    );
    const { wrapper } = await mountDetail(`/saved/${buildSavedProfile().id}`);

    await field(wrapper, FormField.Email).setValue('x@example.co');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const email = field(wrapper, FormField.Email);
    expect(email.attributes('aria-invalid')).toBe('true');
    const message = wrapper.get(`[id="${email.attributes('aria-describedby') ?? ''}"]`);
    expect(message.text()).toContain(he.errors[FieldError.Server]());
    // The server's English text is isolated, so the RTL sentence around it cannot reorder it.
    expect(message.get('bdi[lang="en"]').text()).toBe('Invalid email');
    expect(wrapper.text()).toContain(he.feedback.fixFields);
  });

  it('reports a rejection it cannot pin on an input as a plain failure, not "fix the marked fields"', async () => {
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());
    api.updateSavedProfile.mockRejectedValue(
      new ApiError('Request validation failed', 400, [{ path: 'body.picture.large', message: 'Must be https' }]),
    );
    const { wrapper } = await mountDetail(`/saved/${buildSavedProfile().id}`);

    await field(wrapper, FormField.City).setValue('Austin');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain(he.feedback.failed);
    expect(wrapper.text()).not.toContain(he.feedback.fixFields);
  });

  it('flags stored data that is already invalid, so a disabled Save is explained', async () => {
    api.getSavedProfile.mockResolvedValue(
      buildSavedProfile({ location: { ...buildSavedProfile().location, country: 'Atlantis' } }),
    );
    const { wrapper } = await mountDetail(`/saved/${buildSavedProfile().id}`);

    expect(field(wrapper, FormField.Country).attributes('aria-invalid')).toBe('true');
    expect(wrapper.text()).toContain(he.errors[FieldError.InvalidChoice]());
    expect(wrapper.text()).toContain(he.feedback.invalidForm(1));
  });

  it('keeps the page and explains when an update finds the profile deleted elsewhere', async () => {
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());
    api.updateSavedProfile.mockRejectedValue(new ApiError('gone', 404));
    const { wrapper } = await mountDetail(`/saved/${buildSavedProfile().id}`);

    await field(wrapper, FormField.City).setValue('Austin');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain(he.feedback.deletedElsewhere);
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('tells the user when the server is rate limiting', async () => {
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());
    api.updateSavedProfile.mockRejectedValue(new ApiError('Too many requests', 429));
    const { wrapper } = await mountDetail(`/saved/${buildSavedProfile().id}`);

    await field(wrapper, FormField.City).setValue('Austin');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain(he.feedback.tooManyRequests);
  });
});

describe('ProfileDetailView: saving', () => {
  it('saves the edited details and switches the URL to the saved route', async () => {
    seedRandomBatch();
    api.createSavedProfile.mockResolvedValue(
      buildSavedProfile({ name: { title: Title.Dr, first: 'John', last: 'Smith' } }),
    );
    const { wrapper, router } = await mountDetail(`/random/${buildProfile().id}`);

    // The title combobox opens a floating popper that jsdom cannot lay out; Playwright covers it.
    await field(wrapper, FormField.Last).setValue('Smyth');
    await button(wrapper, he.actions.save).trigger('click');
    await flushPromises();

    expect(api.createSavedProfile).toHaveBeenCalledWith(
      expect.objectContaining({ id: buildProfile().id, name: expect.objectContaining({ last: 'Smyth' }) }),
    );
    expect(router.currentRoute.value.params.source).toBe(ProfileSource.Saved);
    expect(buttonLabels(wrapper)).toContain(he.actions.delete);
    expect(useSavedProfilesStore().isSaved(buildProfile().id)).toBe(true);
  });

  it('shows the stored copy when Save finds the profile already saved elsewhere (409)', async () => {
    const randomStore = seedRandomBatch();
    api.createSavedProfile.mockRejectedValue(new ApiError('exists', 409));
    api.getSavedProfile.mockResolvedValue(buildSavedProfile());
    const { wrapper } = await mountDetail(`/random/${buildProfile().id}`);

    await field(wrapper, FormField.First).setValue('Johnny');
    await button(wrapper, he.actions.save).trigger('click');
    await flushPromises();

    expect((field(wrapper, FormField.First).element as HTMLInputElement).value).toBe('John');
    expect(randomStore.profiles[0]?.name.first).toBe('John');
    expect(wrapper.text()).toContain(he.feedback.alreadySaved);
  });
});
