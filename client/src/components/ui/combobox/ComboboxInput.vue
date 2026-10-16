<script setup lang="ts">
import type { ComboboxInputEmits, ComboboxInputProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { SearchIcon } from '@lucide/vue';
import { reactiveOmit } from '@vueuse/core';
import { cn } from '@/lib/utils';
import { ComboboxInput, useForwardPropsEmits } from 'reka-ui';

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<
  ComboboxInputProps & {
    class?: HTMLAttributes['class'];
  }
>();

const emits = defineEmits<ComboboxInputEmits>();

const delegatedProps = reactiveOmit(props, 'class');

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<!-- Profinq: styled as a form input (not shadcn's command-palette row), with logical, RTL-safe spacing. -->
<template>
  <div data-slot="command-input-wrapper" class="relative w-full">
    <SearchIcon
      class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 opacity-50"
      aria-hidden="true"
    />
    <ComboboxInput
      data-slot="command-input"
      :class="
        cn(
          'border-input bg-background placeholder:text-muted-foreground h-11 w-full min-w-0 rounded-md border ps-9 pe-16 text-base shadow-xs outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50',
          'focus-visible:border-ring focus-visible:ring-(--color-lavender-200) focus-visible:ring-3',
          'aria-invalid:border-destructive',
          props.class,
        )
      "
      v-bind="{ ...$attrs, ...forwarded }"
    >
      <slot />
    </ComboboxInput>
  </div>
</template>
