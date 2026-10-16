import { readonly, shallowRef } from 'vue';
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
}

// One dialog for the whole app, rendered by <ConfirmDialog> in App.vue.
const pending = shallowRef<PendingConfirmation | null>(null);

/**
 * Promise-based replacement for window.confirm(), backed by a native <dialog>:
 * focus trapping, Escape to cancel and the top layer come from the browser,
 * and unlike window.confirm it can be styled and translated (e.g. to Hebrew).
 */
export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    // A newer request supersedes one that is still open.
    pending.value?.resolve(false);
    return new Promise((resolve) => {
      pending.value = { options, resolve };
    });
  }

  function settle(confirmed: boolean): void {
    const current = pending.value;
    pending.value = null;
    current?.resolve(confirmed);
  }

  return { pending: readonly(pending), confirm, settle };
}
