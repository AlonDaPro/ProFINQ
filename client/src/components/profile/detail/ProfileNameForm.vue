<script setup lang="ts">
import { computed, useId } from 'vue';
import {
  NAME_FIELD_MAX_LENGTH,
  NAME_FIELDS,
  NameValidationError,
  REQUIRED_NAME_FIELDS,
  type NameField,
  type NameValidationErrors,
} from '@/domain/profile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { he } from '@/i18n/he';

const props = defineProps<{
  formId: string;
  errors: NameValidationErrors;
  /** Errors are only shown once the user has changed something. */
  showErrors: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{ submit: [] }>();

const title = defineModel<string>('title', { required: true });
const first = defineModel<string>('first', { required: true });
const last = defineModel<string>('last', { required: true });
const models = { title, first, last };

const FIELD_LABEL: Readonly<Record<NameField, string>> = {
  title: he.labels.title,
  first: he.labels.firstName,
  last: he.labels.lastName,
};
const inputIds: Readonly<Record<NameField, string>> = { title: useId(), first: useId(), last: useId() };
const errorIds: Readonly<Record<NameField, string>> = { title: useId(), first: useId(), last: useId() };

function errorText(error: NameValidationError | undefined, field: NameField): string | null {
  if (error === NameValidationError.Required) return he.validation.required;
  if (error === NameValidationError.TooLong) return he.validation.tooLong(NAME_FIELD_MAX_LENGTH[field]);
  return null;
}

const errorTexts = computed(() => {
  const texts: Record<NameField, string | null> = { title: null, first: null, last: null };
  if (props.showErrors) {
    for (const field of NAME_FIELDS) texts[field] = errorText(props.errors[field], field);
  }
  return texts;
});
</script>

<template>
  <form :id="formId" novalidate @submit.prevent="emit('submit')">
    <fieldset :disabled="disabled">
      <legend>{{ he.labels.name }}</legend>
      <div class="name-fields">
        <div v-for="field in NAME_FIELDS" :key="field" class="grid content-start gap-2">
          <Label :for="inputIds[field]">{{ FIELD_LABEL[field] }}</Label>
          <!--
            dir="auto": the browser picks the direction from the first strong character, so a
            Latin name stays LTR (caret, selection and punctuation behave) inside this RTL form,
            and a Persian name from randomuser.me is not forced the wrong way.
          -->
          <Input
            :id="inputIds[field]"
            v-model="models[field].value"
            dir="auto"
            autocomplete="off"
            spellcheck="false"
            :required="REQUIRED_NAME_FIELDS.has(field)"
            :maxlength="NAME_FIELD_MAX_LENGTH[field]"
            :aria-invalid="errorTexts[field] !== null"
            :aria-describedby="errorTexts[field] ? errorIds[field] : undefined"
          />
          <span v-if="errorTexts[field]" :id="errorIds[field]" class="text-destructive text-xs">{{
            errorTexts[field]
          }}</span>
        </div>
      </div>
    </fieldset>
  </form>
</template>

<style scoped>
fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  margin-block-end: var(--space-5);
  padding: 0;
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
}

.name-fields {
  display: grid;
  grid-template-columns: minmax(5rem, 0.6fr) 1fr 1fr;
  gap: var(--space-3);
}

@media (max-width: 560px) {
  .name-fields {
    grid-template-columns: 1fr;
  }
}
</style>
