import { computed, reactive, ref, shallowRef, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { errorMessage, hasHttpStatus } from '@/api/http';
import { HttpStatus } from '@/constants/http';
import { HEBREW_LANG, TextDirection } from '@/constants/locale';
import { ConfirmTone, useConfirm } from '@/composables/useConfirm';
import { namesEqual, normalizeName, validateName, type Profile, type ProfileName } from '@/domain/profile';
import { he } from '@/i18n/he';
import { detailRouteFor, listRouteFor, ProfileSource } from '@/router/routeNames';
import { useRandomProfilesStore } from '@/stores/randomProfiles';
import { useSavedProfilesStore } from '@/stores/savedProfiles';
import { failed, IDLE, LOADING, SUCCESS, type AsyncState } from '@/types/asyncState';
import { FeedbackTone, type Feedback } from '@/types/feedback';

export enum DetailAction {
  Save = 'save',
  Update = 'update',
  Delete = 'delete',
}

function success(message: string): Feedback {
  return { tone: FeedbackTone.Success, message };
}

const HEBREW_DIALOG = { dir: TextDirection.Rtl, lang: HEBREW_LANG, cancelLabel: he.actions.cancel } as const;

/**
 * Screen 3's state and actions. Whether a profile is "saved" is decided by the
 * database (the saved store), not by which list the user came from. The route's
 * `source` only decides where Back leads and which not-found message to show.
 * This keeps Save/Delete correct even when a random person was saved earlier or in another tab.
 */
export function useProfileDetail(props: { readonly source: ProfileSource; readonly id: string }) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const randomStore = useRandomProfilesStore();
  const savedStore = useSavedProfilesStore();

  const lookup = shallowRef<AsyncState>(IDLE);
  const pendingAction = ref<DetailAction | null>(null);
  const feedback = shallowRef<Feedback | null>(null);
  const draft = reactive<ProfileName>({ title: '', first: '', last: '' });
  let bypassLeaveGuard = false;

  const savedProfile = computed(() => savedStore.findById(props.id));
  const isPersisted = computed(() => savedProfile.value !== undefined);
  const profile = computed<Profile | undefined>(() => savedProfile.value ?? randomStore.findById(props.id));

  const validationErrors = computed(() => validateName(draft));
  const isDraftValid = computed(() => Object.keys(validationErrors.value).length === 0);
  const isDirty = computed(() => (profile.value ? !namesEqual(draft, profile.value.name) : false));
  const isBusy = computed(() => pendingAction.value !== null);

  async function resolveProfile(): Promise<void> {
    const id = props.id;
    feedback.value = null;
    if (profile.value) {
      lookup.value = SUCCESS;
      // Needed to know whether a profile from the random batch is already saved.
      void savedStore.ensureLoaded();
      return;
    }
    lookup.value = LOADING;
    try {
      await savedStore.fetchById(id);
      if (id === props.id) lookup.value = SUCCESS;
    } catch (error) {
      // Ignore the answer for a profile the user has already navigated away from.
      if (id === props.id) lookup.value = failed(errorMessage(error));
    }
  }

  watch(() => props.id, resolveProfile, { immediate: true });
  // Follow the stored name (a new profile, or a refresh that picked up a rename elsewhere),
  // but never overwrite what the user is typing.
  watch(
    profile,
    (next, previous) => {
      if (!next) return;
      const draftUntouched = !previous || previous.id !== next.id || namesEqual(draft, previous.name);
      if (draftUntouched) Object.assign(draft, next.name);
    },
    { immediate: true },
  );

  /** Runs one action at a time; a second click while one is pending is ignored. */
  async function runAction(action: DetailAction, task: () => Promise<Feedback | null>): Promise<void> {
    if (pendingAction.value !== null) return;
    pendingAction.value = action;
    feedback.value = null;
    try {
      feedback.value = await task();
    } catch (error) {
      feedback.value = hasHttpStatus(error, HttpStatus.NotFound)
        ? { tone: FeedbackTone.Error, message: he.feedback.deletedElsewhere }
        : { tone: FeedbackTone.Error, message: he.feedback.failed, detail: errorMessage(error) };
    } finally {
      pendingAction.value = null;
    }
  }

  function save(): Promise<void> {
    return runAction(DetailAction.Save, async () => {
      const current = profile.value;
      if (!current || isPersisted.value || !isDraftValid.value) return null;
      // "Save" persists what the user sees, including an un-applied name edit.
      const name = normalizeName(draft);
      const saved = await savedStore.save({ ...current, name });
      // On a 409 the store adopts the copy already in the DB, which may carry a different name.
      randomStore.rename(current.id, saved.name);
      Object.assign(draft, saved.name);
      // The URL should say "saved" now, so a reload resolves the profile from the DB.
      if (props.source === ProfileSource.Random) {
        await router.replace(detailRouteFor(ProfileSource.Saved, current.id));
      }
      return success(namesEqual(saved.name, name) ? he.feedback.saved : he.feedback.alreadySaved);
    });
  }

  function update(): Promise<void> {
    return runAction(DetailAction.Update, async () => {
      const current = profile.value;
      if (!current || !isDirty.value || !isDraftValid.value) return null;
      const name = normalizeName(draft);
      if (isPersisted.value) {
        await savedStore.rename(current.id, name);
        // Keep the random list in sync if this person is also in the current batch.
        randomStore.rename(current.id, name);
        Object.assign(draft, name);
        return success(he.feedback.updatedSaved);
      }
      if (!randomStore.rename(current.id, name)) {
        return { tone: FeedbackTone.Error, message: he.feedback.noLongerInBatch };
      }
      Object.assign(draft, name);
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
    await runAction(DetailAction.Delete, async () => {
      await savedStore.remove(current.id);
      bypassLeaveGuard = true;
      await goBack();
      return null;
    });
  }

  async function goBack(): Promise<void> {
    // Prefer real history so the list keeps its filter and scroll position;
    // fall back to the list route when the page was opened directly.
    if (typeof router.options.history.state.back === 'string') router.back();
    else await router.push(listRouteFor(props.source));
  }

  onBeforeRouteLeave(() => {
    if (bypassLeaveGuard || !isDirty.value) return true;
    return confirm({
      ...HEBREW_DIALOG,
      title: he.confirm.discardTitle,
      body: he.confirm.discardBody,
      confirmLabel: he.confirm.discard,
      tone: ConfirmTone.Danger,
    });
  });

  return {
    profile,
    savedProfile,
    lookup,
    draft,
    validationErrors,
    isDraftValid,
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
