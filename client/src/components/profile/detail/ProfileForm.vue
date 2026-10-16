<script setup lang="ts">
import { computed } from 'vue';
import FormField from '@/components/common/FormField.vue';
import OptionCombobox from '@/components/common/OptionCombobox.vue';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { VisibleFieldError } from '@/composables/useProfileDetail';
import {
  birthYear,
  calculateAge,
  COUNTRIES,
  EARLIEST_DATE_OF_BIRTH,
  FIELD_MAX_LENGTH,
  FormField as Field,
  Gender,
  latestCalendarDate,
  type ProfileForm,
  Title,
} from '@/domain/profile';
import { he } from '@/i18n/he';

const props = defineProps<{
  formId: string;
  errors: Partial<Record<Field, VisibleFieldError>>;
  disabled: boolean;
}>();

const emit = defineEmits<{ submit: [] }>();

const form = defineModel<ProfileForm>('form', { required: true });

const GENDERS = Object.values(Gender);
const TITLES = Object.values(Title);
const LATEST_DATE_OF_BIRTH = latestCalendarDate();

function errorText(field: Field): string | null {
  const error = props.errors[field];
  if (!error) return null;
  return error.serverMessage ?? he.errors[error.code](FIELD_MAX_LENGTH[field]);
}

/** Age and birth year follow the date being typed, but only once it is a real date. */
const derivedAge = computed(() => {
  const value = form.value[Field.DateOfBirth];
  if (props.errors[Field.DateOfBirth] || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return { age: calculateAge(value), year: birthYear(value) };
});
</script>

<template>
  <!--
    Direction rules: labels follow the Hebrew RTL layout. Names, street and place inputs use
    dir="auto" (a Latin value stays LTR, a Persian one RTL). Title, country, email, phone, numbers and dates
    are always dir="ltr": they are Latin or all-neutral characters, which RTL would reorder.
  -->
  <form :id="formId" class="grid gap-5" novalidate @submit.prevent="emit('submit')">
    <fieldset :disabled="disabled" class="contents">
      <Card as="section" class="gap-5 p-6">
        <h2>{{ he.sections.name }}</h2>
        <div class="grid gap-4 sm:grid-cols-[minmax(8rem,0.7fr)_1fr_1fr]">
          <FormField v-slot="{ id, describedBy, invalid }" :label="he.fields.title" :error="errorText(Field.Title)">
            <OptionCombobox
              :id="id"
              v-model="form[Field.Title]"
              :options="TITLES"
              :text="he.title"
              :described-by="describedBy"
              :invalid="invalid"
              :disabled="disabled"
            />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" :label="he.fields.first" :error="errorText(Field.First)">
            <Input
              :id="id"
              v-model="form[Field.First]"
              dir="auto"
              autocomplete="off"
              spellcheck="false"
              required
              :maxlength="FIELD_MAX_LENGTH[Field.First]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" :label="he.fields.last" :error="errorText(Field.Last)">
            <Input
              :id="id"
              v-model="form[Field.Last]"
              dir="auto"
              autocomplete="off"
              spellcheck="false"
              required
              :maxlength="FIELD_MAX_LENGTH[Field.Last]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </FormField>
        </div>
      </Card>

      <div class="grid gap-5 lg:grid-cols-3">
        <Card as="section" class="gap-4 p-6">
          <h2>{{ he.sections.personal }}</h2>
          <FormField v-slot="{ id, describedBy, invalid }" :label="he.fields.gender" :error="errorText(Field.Gender)">
            <NativeSelect
              :id="id"
              v-model="form[Field.Gender]"
              required
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            >
              <NativeSelectOption v-for="gender in GENDERS" :key="gender" :value="gender">
                {{ he.genders[gender] }}
              </NativeSelectOption>
            </NativeSelect>
          </FormField>
          <FormField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.dateOfBirth"
            :error="errorText(Field.DateOfBirth)"
          >
            <Input
              :id="id"
              v-model="form[Field.DateOfBirth]"
              type="date"
              dir="ltr"
              required
              :min="EARLIEST_DATE_OF_BIRTH"
              :max="LATEST_DATE_OF_BIRTH"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </FormField>
          <dl v-if="derivedAge" class="grid grid-cols-2 gap-3">
            <div>
              <dt class="text-muted-foreground text-sm">{{ he.labels.age }}</dt>
              <dd class="font-medium">{{ derivedAge.age }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground text-sm">{{ he.labels.birthYear }}</dt>
              <dd class="font-medium">{{ derivedAge.year }}</dd>
            </div>
          </dl>
        </Card>

        <Card as="section" class="gap-4 p-6">
          <h2>{{ he.sections.address }}</h2>
          <div class="grid grid-cols-[7.5rem_1fr] gap-3">
            <FormField
              v-slot="{ id, describedBy, invalid }"
              :label="he.fields.streetNumber"
              :error="errorText(Field.StreetNumber)"
            >
              <Input
                :id="id"
                v-model="form[Field.StreetNumber]"
                inputmode="numeric"
                dir="ltr"
                autocomplete="off"
                required
                :aria-invalid="invalid || undefined"
                :aria-describedby="describedBy"
              />
            </FormField>
            <FormField
              v-slot="{ id, describedBy, invalid }"
              :label="he.fields.streetName"
              :error="errorText(Field.StreetName)"
            >
              <Input
                :id="id"
                v-model="form[Field.StreetName]"
                dir="auto"
                autocomplete="off"
                required
                :maxlength="FIELD_MAX_LENGTH[Field.StreetName]"
                :aria-invalid="invalid || undefined"
                :aria-describedby="describedBy"
              />
            </FormField>
          </div>
          <FormField v-slot="{ id, describedBy, invalid }" :label="he.fields.city" :error="errorText(Field.City)">
            <Input
              :id="id"
              v-model="form[Field.City]"
              dir="auto"
              autocomplete="off"
              required
              :maxlength="FIELD_MAX_LENGTH[Field.City]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </FormField>
          <FormField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.state"
            :note="he.labels.optional"
            :error="errorText(Field.State)"
          >
            <Input
              :id="id"
              v-model="form[Field.State]"
              dir="auto"
              autocomplete="off"
              :maxlength="FIELD_MAX_LENGTH[Field.State]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" :label="he.fields.country" :error="errorText(Field.Country)">
            <OptionCombobox
              :id="id"
              v-model="form[Field.Country]"
              :options="COUNTRIES"
              :text="he.country"
              :described-by="describedBy"
              :invalid="invalid"
              :disabled="disabled"
            />
          </FormField>
        </Card>

        <Card as="section" class="gap-4 p-6">
          <h2>{{ he.sections.contact }}</h2>
          <FormField v-slot="{ id, describedBy, invalid }" :label="he.fields.email" :error="errorText(Field.Email)">
            <Input
              :id="id"
              v-model="form[Field.Email]"
              type="email"
              inputmode="email"
              dir="ltr"
              autocomplete="off"
              spellcheck="false"
              required
              :maxlength="FIELD_MAX_LENGTH[Field.Email]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </FormField>
          <FormField v-slot="{ id, describedBy, invalid }" :label="he.fields.phone" :error="errorText(Field.Phone)">
            <Input
              :id="id"
              v-model="form[Field.Phone]"
              type="tel"
              inputmode="tel"
              dir="ltr"
              autocomplete="off"
              required
              :maxlength="FIELD_MAX_LENGTH[Field.Phone]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </FormField>
        </Card>
      </div>
    </fieldset>
  </form>
</template>
