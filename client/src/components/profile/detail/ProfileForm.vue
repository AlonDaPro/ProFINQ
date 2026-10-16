<script setup lang="ts">
import { computed } from 'vue';
import LabeledField from '@/components/common/LabeledField.vue';
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
  FormField,
  Gender,
  latestCalendarDate,
  type ProfileForm,
  Title,
} from '@/domain/profile';
import { he } from '@/i18n/he';
import type { FieldMessage } from '@/types/fieldMessage';

const props = defineProps<{
  formId: string;
  errors: Partial<Record<FormField, VisibleFieldError>>;
  disabled: boolean;
}>();

const emit = defineEmits<{ submit: [] }>();

const form = defineModel<ProfileForm>('form', { required: true });

const GENDERS = Object.values(Gender);
const TITLES = Object.values(Title);
const LATEST_DATE_OF_BIRTH = latestCalendarDate();

function errorText(field: FormField): FieldMessage | null {
  const error = props.errors[field];
  if (!error) return null;
  return { text: he.errors[error.code](FIELD_MAX_LENGTH[field]), detail: error.serverMessage };
}

/** Age and birth year follow the date being typed, but only once it is a real date. */
const derivedAge = computed(() => {
  const value = form.value[FormField.DateOfBirth];
  if (props.errors[FormField.DateOfBirth]) return null;
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
          <LabeledField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.title"
            :error="errorText(FormField.Title)"
          >
            <OptionCombobox
              :id="id"
              v-model="form[FormField.Title]"
              :options="TITLES"
              :text="he.title"
              :described-by="describedBy"
              :invalid="invalid"
              :disabled="disabled"
            />
          </LabeledField>
          <LabeledField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.first"
            :error="errorText(FormField.First)"
          >
            <Input
              :id="id"
              v-model="form[FormField.First]"
              dir="auto"
              autocomplete="off"
              spellcheck="false"
              required
              :maxlength="FIELD_MAX_LENGTH[FormField.First]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </LabeledField>
          <LabeledField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.last"
            :error="errorText(FormField.Last)"
          >
            <Input
              :id="id"
              v-model="form[FormField.Last]"
              dir="auto"
              autocomplete="off"
              spellcheck="false"
              required
              :maxlength="FIELD_MAX_LENGTH[FormField.Last]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </LabeledField>
        </div>
      </Card>

      <div class="grid gap-5 lg:grid-cols-3">
        <Card as="section" class="gap-4 p-6">
          <h2>{{ he.sections.personal }}</h2>
          <LabeledField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.gender"
            :error="errorText(FormField.Gender)"
          >
            <NativeSelect
              :id="id"
              v-model="form[FormField.Gender]"
              required
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            >
              <NativeSelectOption v-for="gender in GENDERS" :key="gender" :value="gender">
                {{ he.genders[gender] }}
              </NativeSelectOption>
            </NativeSelect>
          </LabeledField>
          <LabeledField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.dateOfBirth"
            :error="errorText(FormField.DateOfBirth)"
          >
            <Input
              :id="id"
              v-model="form[FormField.DateOfBirth]"
              type="date"
              dir="ltr"
              required
              :min="EARLIEST_DATE_OF_BIRTH"
              :max="LATEST_DATE_OF_BIRTH"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </LabeledField>
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
            <LabeledField
              v-slot="{ id, describedBy, invalid }"
              :label="he.fields.streetNumber"
              :error="errorText(FormField.StreetNumber)"
            >
              <Input
                :id="id"
                v-model="form[FormField.StreetNumber]"
                inputmode="numeric"
                dir="ltr"
                autocomplete="off"
                required
                :aria-invalid="invalid || undefined"
                :aria-describedby="describedBy"
              />
            </LabeledField>
            <LabeledField
              v-slot="{ id, describedBy, invalid }"
              :label="he.fields.streetName"
              :error="errorText(FormField.StreetName)"
            >
              <Input
                :id="id"
                v-model="form[FormField.StreetName]"
                dir="auto"
                autocomplete="off"
                required
                :maxlength="FIELD_MAX_LENGTH[FormField.StreetName]"
                :aria-invalid="invalid || undefined"
                :aria-describedby="describedBy"
              />
            </LabeledField>
          </div>
          <LabeledField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.city"
            :error="errorText(FormField.City)"
          >
            <Input
              :id="id"
              v-model="form[FormField.City]"
              dir="auto"
              autocomplete="off"
              required
              :maxlength="FIELD_MAX_LENGTH[FormField.City]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </LabeledField>
          <LabeledField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.state"
            :note="he.labels.optional"
            :error="errorText(FormField.State)"
          >
            <Input
              :id="id"
              v-model="form[FormField.State]"
              dir="auto"
              autocomplete="off"
              :maxlength="FIELD_MAX_LENGTH[FormField.State]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </LabeledField>
          <LabeledField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.country"
            :error="errorText(FormField.Country)"
          >
            <OptionCombobox
              :id="id"
              v-model="form[FormField.Country]"
              :options="COUNTRIES"
              :text="he.country"
              :described-by="describedBy"
              :invalid="invalid"
              :disabled="disabled"
            />
          </LabeledField>
        </Card>

        <Card as="section" class="gap-4 p-6">
          <h2>{{ he.sections.contact }}</h2>
          <LabeledField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.email"
            :error="errorText(FormField.Email)"
          >
            <Input
              :id="id"
              v-model="form[FormField.Email]"
              type="email"
              inputmode="email"
              dir="ltr"
              autocomplete="off"
              spellcheck="false"
              required
              :maxlength="FIELD_MAX_LENGTH[FormField.Email]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </LabeledField>
          <LabeledField
            v-slot="{ id, describedBy, invalid }"
            :label="he.fields.phone"
            :error="errorText(FormField.Phone)"
          >
            <Input
              :id="id"
              v-model="form[FormField.Phone]"
              type="tel"
              inputmode="tel"
              dir="ltr"
              autocomplete="off"
              required
              :maxlength="FIELD_MAX_LENGTH[FormField.Phone]"
              :aria-invalid="invalid || undefined"
              :aria-describedby="describedBy"
            />
          </LabeledField>
        </Card>
      </div>
    </fieldset>
  </form>
</template>
