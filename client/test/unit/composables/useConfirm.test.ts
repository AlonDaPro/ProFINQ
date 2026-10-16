import { describe, expect, it } from 'vitest';
import { useConfirm, type ConfirmOptions } from '@/composables/useConfirm';

const OPTIONS: ConfirmOptions = {
  title: 'Delete?',
  body: 'Gone for good.',
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
};

describe('useConfirm', () => {
  it('resolves with the user choice and clears the pending request', async () => {
    const { confirm, settle, pending } = useConfirm();

    const answer = confirm(OPTIONS);
    expect(pending.value?.options).toEqual(OPTIONS);
    settle(true);

    await expect(answer).resolves.toBe(true);
    expect(pending.value).toBeNull();
  });

  it('cancels an open request when a newer one supersedes it', async () => {
    const { confirm, settle } = useConfirm();

    const first = confirm(OPTIONS);
    const second = confirm({ ...OPTIONS, title: 'Leave?' });
    settle(true);

    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
  });
});
