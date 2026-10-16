<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { DetailAction } from '@/composables/useProfileDetail';
import { he } from '@/i18n/he';

defineProps<{
  /** The name form this toolbar's Update button submits; that is what makes Enter in a name field run Update. */
  formId: string;
  isPersisted: boolean;
  isBusy: boolean;
  isDirty: boolean;
  isDraftValid: boolean;
  pendingAction: DetailAction | null;
}>();

const emit = defineEmits<{ save: []; delete: []; back: [] }>();
</script>

<template>
  <!--
    DOM order is reading order, so in RTL the primary action sits on the right (where the eye
    starts) and Back is pushed to the far end. Save and Delete are mutually exclusive.
  -->
  <div class="actions">
    <Button v-if="!isPersisted" :disabled="isBusy || !isDraftValid" @click="emit('save')">
      {{ pendingAction === DetailAction.Save ? he.pending.save : he.actions.save }}
    </Button>
    <Button
      type="submit"
      :form="formId"
      :variant="isPersisted ? 'default' : 'outline'"
      :disabled="isBusy || !isDirty || !isDraftValid"
    >
      {{ pendingAction === DetailAction.Update ? he.pending.update : he.actions.update }}
    </Button>
    <Button v-if="isPersisted" variant="destructive-outline" :disabled="isBusy" @click="emit('delete')">
      {{ pendingAction === DetailAction.Delete ? he.pending.delete : he.actions.delete }}
    </Button>
    <Button variant="ghost" class="back" :disabled="isBusy" @click="emit('back')">
      <ChevronLeft class="icon-directional" aria-hidden="true" />
      {{ he.actions.back }}
    </Button>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* Logical property: the far end is the left in RTL and would be the right in LTR. */
.back {
  margin-inline-start: auto;
}
</style>
