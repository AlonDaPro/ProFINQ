<script setup lang="ts" generic="T extends string">
import { Check, ChevronsUpDown, X } from '@lucide/vue';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox';
import { TextDirection } from '@/constants/locale';

export interface OptionComboboxText {
  placeholder: string;
  /** Accessible name of the button that opens the list. */
  search: string;
  noMatches: string;
  /** Accessible name of the clear button; without it the value cannot be cleared. */
  clear?: string;
}

const props = defineProps<{
  id: string;
  options: readonly T[];
  text: OptionComboboxText;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
}>();

/** The form's raw value; '' (or anything off the list) means nothing is selected. */
const model = defineModel<string>({ required: true });

const selected = computed({
  get: () => props.options.find((option) => option === model.value),
  set: (value: T | undefined) => {
    model.value = value ?? '';
  },
});
</script>

<template>
  <!--
    Only listed options can be committed: typing filters the list (accent- and case-insensitive),
    it never becomes the value. The whole control is LTR: the options are Latin, and the input, its
    icons and the list must agree on one direction, or the text runs under the icons in RTL.
  -->
  <Combobox v-model="selected" :dir="TextDirection.Ltr" :disabled="disabled" open-on-click>
    <ComboboxAnchor class="relative w-full" :dir="TextDirection.Ltr">
      <ComboboxInput
        :id="id"
        :display-value="(value: T | undefined) => value ?? ''"
        :placeholder="text.placeholder"
        :aria-describedby="describedBy"
        :aria-invalid="invalid || undefined"
        :dir="TextDirection.Ltr"
        autocomplete="off"
      />
      <Button
        v-if="text.clear && selected"
        type="button"
        variant="ghost"
        size="icon"
        class="absolute end-8 top-1/2 size-7 -translate-y-1/2"
        :aria-label="text.clear"
        :disabled="disabled"
        @click="selected = undefined"
      >
        <X class="size-3.5" aria-hidden="true" />
      </Button>
      <ComboboxTrigger
        class="text-muted-foreground absolute end-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full"
        :aria-label="text.search"
      >
        <ChevronsUpDown class="size-4" aria-hidden="true" />
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxList
      class="max-h-[min(18rem,var(--reka-combobox-content-available-height))] w-(--reka-combobox-trigger-width) min-w-40 overflow-y-auto p-1"
      align="start"
    >
      <ComboboxEmpty class="text-muted-foreground py-4">{{ text.noMatches }}</ComboboxEmpty>
      <ComboboxItem v-for="option in options" :key="option" :value="option">
        {{ option }}
        <ComboboxItemIndicator class="ms-auto">
          <Check class="size-4" aria-hidden="true" />
        </ComboboxItemIndicator>
      </ComboboxItem>
    </ComboboxList>
  </Combobox>
</template>
