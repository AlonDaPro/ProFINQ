<script setup lang="ts">
import { Check } from '@lucide/vue';
import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';
import { HEBREW_LOCALE } from '@/constants/locale';
import { he } from '@/i18n/he';

const props = defineProps<{ savedAt: string }>();

const dateFormat = new Intl.DateTimeFormat(HEBREW_LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
const savedOn = computed(() => dateFormat.format(new Date(props.savedAt)));
</script>

<template>
  <Badge variant="success">
    <span class="grid size-6 place-items-center rounded-full bg-(--color-success) text-white">
      <Check class="size-3.5" :stroke-width="3" aria-hidden="true" />
    </span>
    <span class="font-medium">{{ he.status.saved }}</span>
    <span class="opacity-85"
      >{{ he.status.savedOn }}<bdi dir="ltr">{{ savedOn }}</bdi></span
    >
  </Badge>
</template>
