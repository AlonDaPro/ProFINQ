<script setup lang="ts">
import { CircleAlert } from '@lucide/vue';
import { useId } from 'vue';
import { Label } from '@/components/ui/label';

defineProps<{
  label: string;
  /** Shown under the control, and wired to it through aria-describedby. */
  error?: string | null;
  /** Small note after the label, e.g. "(optional)". */
  note?: string;
}>();

defineSlots<{
  default(props: { id: string; describedBy: string | undefined; invalid: boolean }): unknown;
}>();

const controlId = useId();
const errorId = useId();
</script>

<template>
  <div class="grid content-start gap-2">
    <Label :for="controlId">
      {{ label }}
      <span v-if="note" class="text-muted-foreground font-normal">{{ note }}</span>
    </Label>
    <slot :id="controlId" :described-by="error ? errorId : undefined" :invalid="Boolean(error)" />
    <p v-if="error" :id="errorId" class="text-destructive flex items-start gap-1.5 text-xs">
      <CircleAlert class="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>
