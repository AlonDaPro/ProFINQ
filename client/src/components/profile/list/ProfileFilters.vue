<script setup lang="ts">
import { useId } from 'vue';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { en } from '@/i18n/en';

defineProps<{ countries: readonly string[] }>();

const name = defineModel<string>('name', { required: true });
const country = defineModel<string>('country', { required: true });

const nameInputId = useId();
const countrySelectId = useId();
</script>

<template>
  <!-- Filtering is instant (no debounce): it runs in memory over at most a few dozen rows. -->
  <form
    class="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
    role="search"
    :aria-label="en.filters.label"
    @submit.prevent
  >
    <div class="grid gap-2">
      <Label :for="nameInputId">{{ en.filters.name }}</Label>
      <Input
        :id="nameInputId"
        v-model="name"
        type="search"
        dir="auto"
        autocomplete="off"
        spellcheck="false"
        :placeholder="en.filters.namePlaceholder"
      />
    </div>
    <div class="grid gap-2">
      <Label :for="countrySelectId">{{ en.filters.country }}</Label>
      <!-- Native select on purpose: the platform picker is the better experience on phones. -->
      <NativeSelect :id="countrySelectId" v-model="country">
        <NativeSelectOption value="">{{ en.filters.allCountries }}</NativeSelectOption>
        <NativeSelectOption v-for="option in countries" :key="option" :value="option">{{ option }}</NativeSelectOption>
      </NativeSelect>
    </div>
  </form>
</template>
