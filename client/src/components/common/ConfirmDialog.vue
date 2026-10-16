<script setup lang="ts">
import { computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/composables/useConfirm';

const { pending, settle } = useConfirm();
const router = useRouter();

const options = computed(() => pending.value?.options);
const isOpen = computed(() => pending.value !== null);

// Cancel and Escape close the dialog through here; both mean "no".
function onOpenChange(open: boolean): void {
  if (!open) settle(false);
}

// A prompt belongs to the screen that opened it. If navigation completes anyway (browser Back,
// a header link), cancel it, so a late "confirm" cannot act on a page that is gone.
const removeAfterEach = router.afterEach(() => {
  if (pending.value) settle(false);
});
onUnmounted(removeAfterEach);
</script>

<template>
  <AlertDialog :open="isOpen" @update:open="onOpenChange">
    <!-- Rendered in a portal outside the page, so it carries its own direction and language. -->
    <!-- Focus is returned by useConfirm, not Reka: there is no trigger element for Reka to return to. -->
    <AlertDialogContent
      v-if="options"
      :dir="options.dir"
      :lang="options.lang"
      @close-auto-focus="(event: Event) => event.preventDefault()"
    >
      <AlertDialogHeader>
        <AlertDialogTitle class="text-xl font-medium">{{ options.title }}</AlertDialogTitle>
        <AlertDialogDescription class="text-muted-foreground">{{ options.body }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <!-- Reka focuses Cancel when the dialog opens: the safe choice is the default. -->
        <AlertDialogCancel>{{ options.cancelLabel }}</AlertDialogCancel>
        <!-- A plain Button, not AlertDialogAction: Action closes first, which would resolve "no". -->
        <Button variant="destructive" @click="settle(true)">
          {{ options.confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
