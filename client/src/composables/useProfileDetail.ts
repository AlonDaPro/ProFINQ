import { useEventListener } from '@vueuse/core';
import { computed, reactive, ref, shallowRef, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { ApiError, errorMessage, hasHttpStatus } from '@/api/http';
import { ConfirmTone, useConfirm } from '@/composables/useConfirm';
import { HttpStatus } from '@/constants/http';
import { HEBREW_LANG, TextDirection } from '@/constants/locale';
import {
  FieldError,
  FormField,
  formsEqual,
  parseProfileForm,
  pickDetails,
  SERVER_PATH_TO_FIELD,
  toProfileForm,
  type Profile,
  type ProfileDetails,
  type ProfileForm,
} from '@/domain/profile';
import { he } from '@/i18n/he';
import { detailRouteFor, listRouteFor, ProfileSource, RouteName } from '@/router/routeNames';
import { useRandomProfilesStore } from '@/stores/randomProfiles';
import { useSavedProfilesStore } from '@/stores/savedProfiles';
import { failed, IDLE, LOADING, SUCCESS, type AsyncState } from '@/types/asyncState';
import { FeedbackTone, type Feedback } from '@/types/feedback';

export enum DetailAction {
  Save = 'save',
  Update = 'update',
  Delete = 'delete',
}

/** A problem to show under one input: a known code, or (for server rejections) the server's text. */
export interface VisibleFieldError {
  code: FieldError;
  serverMessage?: string;
}

const FORM_FIELDS = Object.values(FormField);
const EMPTY_FORM: Readonly<ProfileForm> = Object.freeze(
  Object.fromEntries(FORM_FIELDS.map((field) => [field, ''])) as ProfileForm,
);
const HEBREW_DIALOG = { dir: TextDirection.Rtl, lang: HEBREW_LANG, cancelLabel: he.actions.cancel } as const;

function success(message: string): Feedback {
  return { tone: FeedbackTone.Success, message };
}

function failure(message: string, detail?: string): Feedback {
  return { tone: FeedbackTone.Error, message, detail };
}

/**
 * Screen 3's state and actions. "Saved" is decided by the database (the saved store), not by the
 * list the user came from; the route's `source` only picks where Back leads.
 */
export function useProfileDetail(props: { readonly source: ProfileSource; readonly id: string }) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const randomStore = useRandomProfilesStore();
  const savedStore = useSavedProfilesStore();

  const profileLookup = shallowRef<AsyncState>(IDLE);
  const pendingAction = ref<DetailAction | null>(null);
  const feedback = shallowRef<Feedback | null>(null);
  const form = reactive<ProfileForm>({ ...EMPTY_FORM });
  /** The server's own messages for fields it rejected; cleared as soon as the user edits. */
  const serverErrors = shallowRef<Partial<Record<FormField, string>>>({});
  /**
   * Keeps the page rendered when the profile disappears under it: while a delete navigates away
   * (instead of flashing "not found"), or after an update finds it deleted elsewhere.
   */
  const retainedProfile = shallowRef<Profile | null>(null);
  let bypassLeaveGuard = false;
  /** The discard prompt is open: a navigation is pending and nothing else may replace it. */
  let isLeaving = false;

  const savedProfile = computed(() => savedStore.findById(props.id));
  const isPersisted = computed(() => savedProfile.value !== undefined);
  const profile = computed<Profile | undefined>(
    () => savedProfile.value ?? randomStore.findById(props.id) ?? retainedProfile.value ?? undefined,
  );
  const storedForm = computed(() => (profile.value ? toProfileForm(profile.value) : null));

  const parsed = computed(() => parseProfileForm(form));
  const isFormValid = computed(() => parsed.value.ok);
  const invalidFieldCount = computed(() => (parsed.value.ok ? 0 : Object.keys(parsed.value.errors).length));
  const isDirty = computed(() => (storedForm.value ? !formsEqual(form, storedForm.value) : false));
  const isBusy = computed(() => pendingAction.value !== null);

  /**
   * Every invalid field, plus anything the server rejected. Valid stored data shows no errors until
   * an edit breaks it; stored data that is already invalid (e.g. an unknown country) is flagged at
   * once, so a disabled Save never goes unexplained.
   */
  const visibleErrors = computed(() => {
    const errors: Partial<Record<FormField, VisibleFieldError>> = {};
    const clientErrors = parsed.value.ok ? {} : parsed.value.errors;
    for (const field of FORM_FIELDS) {
      const serverMessage = serverErrors.value[field];
      const code = clientErrors[field];
      if (serverMessage) errors[field] = { code: FieldError.Server, serverMessage };
      else if (code) errors[field] = { code };
    }
    return errors;
  });

  function resetForm(details: ProfileDetails): void {
    Object.assign(form, toProfileForm(details));
    serverErrors.value = {};
  }

  async function resolveProfile(): Promise<void> {
    const id = props.id;
    feedback.value = null;
    if (profile.value) {
      profileLookup.value = SUCCESS;
      // Whether a profile from the random batch is already saved. Non-fatal: Save handles a 409.
      if (!isPersisted.value) savedStore.lookup([id]).catch(() => undefined);
      return;
    }
    profileLookup.value = LOADING;
    try {
      await savedStore.fetchById(id);
      // Ignore the answer for a profile the user has already navigated away from.
      if (id === props.id) profileLookup.value = SUCCESS;
    } catch (error) {
      if (id === props.id) profileLookup.value = failed(errorMessage(error));
    }
  }

  watch(() => props.id, resolveProfile, { immediate: true });

  // Follow the stored profile (a new id, or a refresh that picked up an edit made elsewhere),
  // but never overwrite what the user is typing.
  watch(
    profile,
    (next, previous) => {
      if (!next) return;
      const untouched = !previous || previous.id !== next.id || formsEqual(form, toProfileForm(previous));
      if (untouched) resetForm(next);
    },
    { immediate: true },
  );

  watch(form, () => {
    if (Object.keys(serverErrors.value).length > 0) serverErrors.value = {};
  });

  function feedbackFor(error: unknown): Feedback {
    if (error instanceof ApiError && error.status === HttpStatus.BadRequest && error.details.length > 0) {
      const mapped: Partial<Record<FormField, string>> = {};
      for (const detail of error.details) {
        const field = SERVER_PATH_TO_FIELD[detail.path];
        if (field) mapped[field] ??= detail.message;
      }
      // Nothing to mark (e.g. the picture was rejected): say what failed instead of "fix the fields".
      if (Object.keys(mapped).length > 0) {
        serverErrors.value = mapped;
        return failure(he.feedback.fixFields);
      }
    }
    if (hasHttpStatus(error, HttpStatus.NotFound)) return failure(he.feedback.deletedElsewhere);
    if (hasHttpStatus(error, HttpStatus.TooManyRequests)) return failure(he.feedback.tooManyRequests);
    return failure(he.feedback.failed, errorMessage(error));
  }

  /** Runs one action at a time; a second click while one is pending is ignored. */
  async function runAction(action: DetailAction, task: () => Promise<Feedback | null>): Promise<void> {
    if (pendingAction.value !== null) return;
    pendingAction.value = action;
    feedback.value = null;
    try {
      feedback.value = await task();
    } catch (error) {
      feedback.value = feedbackFor(error);
    } finally {
      pendingAction.value = null;
    }
  }

  function save(): Promise<void> {
    return runAction(DetailAction.Save, async () => {
      const current = profile.value;
      const result = parsed.value;
      if (!current || isPersisted.value || !result.ok) return null;
      // "Save" persists what the user sees, including edits not yet applied with Update.
      const saved = await savedStore.save({ ...current, ...result.details });
      const savedDetails = pickDetails(saved);
      // On a 409 the store adopts the copy already in the DB, which may differ from the form.
      randomStore.update(current.id, savedDetails);
      const matchesForm = formsEqual(toProfileForm(savedDetails), toProfileForm(result.details));
      resetForm(savedDetails);
      // The URL should say "saved" now, so a reload resolves the profile from the DB. Only if the
      // user is still here: Back stays enabled during a save, and must not be undone.
      const route = router.currentRoute.value;
      const isStillHere = route.name === RouteName.ProfileDetail && route.params.id === current.id;
      if (props.source === ProfileSource.Random && isStillHere && !isLeaving) {
        await router.replace(detailRouteFor(ProfileSource.Saved, current.id));
      }
      return success(matchesForm ? he.feedback.saved : he.feedback.alreadySaved);
    });
  }

  function update(): Promise<void> {
    return runAction(DetailAction.Update, async () => {
      const current = profile.value;
      const result = parsed.value;
      if (!current || !isDirty.value || !result.ok) return null;
      if (isPersisted.value) {
        let updated: ProfileDetails;
        try {
          updated = pickDetails(await savedStore.update(current.id, result.details));
        } catch (error) {
          // A 404 drops the profile from the store; keep it on screen so the message is seen.
          if (hasHttpStatus(error, HttpStatus.NotFound)) retainedProfile.value = current;
          throw error;
        }
        // Keep the random list in sync if this person is also in the current batch.
        randomStore.update(current.id, updated);
        resetForm(updated);
        return success(he.feedback.updatedSaved);
      }
      if (!randomStore.update(current.id, result.details)) return failure(he.feedback.noLongerInBatch);
      resetForm(result.details);
      return success(he.feedback.updatedLocal);
    });
  }

  async function remove(): Promise<void> {
    const current = profile.value;
    if (!current || !isPersisted.value || isBusy.value) return;
    const confirmed = await confirm({
      ...HEBREW_DIALOG,
      title: he.confirm.deleteTitle,
      body: he.confirm.deleteBody,
      confirmLabel: he.actions.delete,
      tone: ConfirmTone.Danger,
    });
    if (!confirmed) return;
    retainedProfile.value = current;
    await runAction(DetailAction.Delete, async () => {
      await savedStore.remove(current.id);
      bypassLeaveGuard = true;
      await goBack();
      return null;
    });
    // Still here means the delete failed; stop pretending the profile exists.
    if (!bypassLeaveGuard) retainedProfile.value = null;
  }

  /** Resolves once the navigation has finished (or was cancelled), so callers stay busy until then. */
  async function goBack(): Promise<void> {
    // Prefer real history so the list keeps its filter and scroll position;
    // fall back to the list route when the page was opened directly.
    if (typeof router.options.history.state.back !== 'string') {
      await router.push(listRouteFor(props.source));
      return;
    }
    const navigated = new Promise<void>((resolve) => {
      const stop = router.afterEach(() => {
        stop();
        resolve();
      });
    });
    router.back();
    await navigated;
  }

  onBeforeRouteLeave(async () => {
    if (bypassLeaveGuard || !isDirty.value) return true;
    isLeaving = true;
    try {
      return await confirm({
        ...HEBREW_DIALOG,
        title: he.confirm.discardTitle,
        body: he.confirm.discardBody,
        confirmLabel: he.confirm.discard,
        tone: ConfirmTone.Danger,
      });
    } finally {
      isLeaving = false;
    }
  });

  // Reload and tab close bypass the router: let the browser ask before unsaved edits are lost.
  useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
    if (isDirty.value && !bypassLeaveGuard) event.preventDefault();
  });

  return {
    profile,
    savedProfile,
    profileLookup,
    form,
    visibleErrors,
    isFormValid,
    invalidFieldCount,
    isDirty,
    isPersisted,
    isBusy,
    pendingAction,
    feedback,
    save,
    update,
    remove,
    goBack,
    retryLookup: resolveProfile,
  };
}
