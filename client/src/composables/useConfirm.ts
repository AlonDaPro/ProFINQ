import { nextTick, readonly, shallowRef } from 'vue';
import type { TextDirection } from '@/constants/locale';

export enum ConfirmTone {
  Default = 'default',
  Danger = 'danger',
}

export interface ConfirmOptions {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: ConfirmTone;
  /** The dialog renders in the top layer, outside the page, so it must carry its own direction. */
  dir?: TextDirection;
  lang?: string;
}

interface PendingConfirmation {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
  /** Where focus goes back to when the dialog closes (the dialog has no trigger element of its own). */
  returnFocus: HTMLElement | null;
}

// One dialog for the whole app, rendered by <ConfirmDialog> in App.vue.
const pending = shallowRef<PendingConfirmation | null>(null);

/** A promise-based window.confirm() rendered by <ConfirmDialog> (a Reka AlertDialog), so it can be styled and translated. */
export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    // A newer request supersedes one that is still open.
    pending.value?.resolve(false);
    const active = document.activeElement;
    return new Promise((resolve) => {
      pending.value = { options, resolve, returnFocus: active instanceof HTMLElement ? active : null };
    });
  }

  function settle(confirmed: boolean): void {
    const current = pending.value;
    pending.value = null;
    current?.resolve(confirmed);
    // After the dialog unmounts; skipped if the action removed the element (e.g. navigated away).
    void nextTick(() => {
      if (current?.returnFocus?.isConnected) current.returnFocus.focus();
    });
  }

  return { pending: readonly(pending), confirm, settle };
}
