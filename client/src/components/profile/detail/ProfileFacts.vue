<script setup lang="ts">
import { computed } from 'vue';
import { birthYear, calculateAge, type Profile } from '@/domain/profile';
import { Card } from '@/components/ui/card';
import { genderLabel, he } from '@/i18n/he';

const props = defineProps<{ profile: Profile }>();

const age = computed(() => calculateAge(props.profile.dateOfBirth));
const yearOfBirth = computed(() => birthYear(props.profile.dateOfBirth));
const NO_VALUE = '—';
</script>

<template>
  <!--
    Labels are Hebrew and follow the RTL layout. Every value is user data from another
    language, so each one is direction-isolated (<bdi> or dir) and never inherits RTL.
  -->
  <div class="facts">
    <Card as="section" class="gap-5 p-6">
      <h2>{{ he.sections.personal }}</h2>
      <dl>
        <div>
          <dt>{{ he.labels.gender }}</dt>
          <dd>{{ genderLabel(profile.gender) }}</dd>
        </div>
        <div>
          <dt>{{ he.labels.age }}</dt>
          <dd>{{ age }}</dd>
        </div>
        <div>
          <dt>{{ he.labels.birthYear }}</dt>
          <dd>{{ yearOfBirth }}</dd>
        </div>
      </dl>
    </Card>

    <Card as="section" class="gap-5 p-6">
      <h2>{{ he.sections.address }}</h2>
      <dl>
        <div>
          <dt>{{ he.labels.street }}</dt>
          <!-- One isolate for number + name, so the number stays attached to an LTR street name. -->
          <dd>
            <bdi>{{ profile.location.streetNumber }} {{ profile.location.streetName }}</bdi>
          </dd>
        </div>
        <div>
          <dt>{{ he.labels.city }}</dt>
          <dd>
            <bdi>{{ profile.location.city }}</bdi>
          </dd>
        </div>
        <div>
          <dt>{{ he.labels.state }}</dt>
          <dd>
            <bdi>{{ profile.location.state || NO_VALUE }}</bdi>
          </dd>
        </div>
        <div>
          <dt>{{ he.labels.country }}</dt>
          <dd>
            <bdi>{{ profile.location.country }}</bdi>
          </dd>
        </div>
      </dl>
    </Card>

    <Card as="section" class="gap-5 p-6">
      <h2>{{ he.sections.contact }}</h2>
      <dl>
        <div>
          <dt>{{ he.labels.email }}</dt>
          <dd>
            <a :href="`mailto:${profile.email}`" dir="ltr" lang="en">{{ profile.email }}</a>
          </dd>
        </div>
        <div>
          <dt>{{ he.labels.phone }}</dt>
          <dd>
            <!-- A phone number has no strong characters; without dir="ltr", RTL reorders "(272) 790-0888". -->
            <a :href="`tel:${profile.phone}`" dir="ltr" lang="en">{{ profile.phone }}</a>
          </dd>
        </div>
      </dl>
    </Card>
  </div>
</template>

<style scoped>
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: var(--space-5);
}

dl {
  display: grid;
  gap: var(--space-4);
  margin: 0;
}

dt {
  color: var(--color-ink-muted);
  font-size: var(--text-sm);
}

dd {
  font-weight: var(--weight-medium);
}

dd {
  margin: 0;
  overflow-wrap: anywhere;
}

dd a {
  text-decoration: underline;
}
</style>
