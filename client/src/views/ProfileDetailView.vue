<script setup lang="ts">
import { useId } from 'vue';
import { ChevronLeft } from '@lucide/vue';
import ProfileActions from '@/components/profile/detail/ProfileActions.vue';
import ProfileFacts from '@/components/profile/detail/ProfileFacts.vue';
import ProfileHero from '@/components/profile/detail/ProfileHero.vue';
import ProfileNameForm from '@/components/profile/detail/ProfileNameForm.vue';
import StatusMessage from '@/components/common/StatusMessage.vue';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useProfileDetail } from '@/composables/useProfileDetail';
import { he } from '@/i18n/he';
import { ProfileSource } from '@/router/routeNames';
import { AsyncStatus } from '@/types/asyncState';
import { FeedbackTone } from '@/types/feedback';

const props = defineProps<{ source: ProfileSource; id: string }>();

const {
  profile,
  savedProfile,
  lookup,
  draft,
  validationErrors,
  isDraftValid,
  isDirty,
  isPersisted,
  isBusy,
  pendingAction,
  feedback,
  save,
  update,
  remove,
  goBack,
  retryLookup,
} = useProfileDetail(props);

const nameFormId = useId();
</script>

<template>
  <!--
    Screen 3 is RTL Hebrew; the rest of the app stays LTR English. Only this subtree
    flips, and every piece of user data inside it is direction-isolated.
  -->
  <article dir="rtl" lang="he">
    <div v-if="lookup.status !== AsyncStatus.Success" class="page-width narrow">
      <StatusMessage v-if="lookup.status === AsyncStatus.Error" :tone="FeedbackTone.Error">
        {{ he.feedback.failed }} <bdi lang="en">{{ lookup.message }}</bdi>
        <template #action>
          <Button variant="outline" @click="retryLookup">{{ he.retry }}</Button>
        </template>
      </StatusMessage>
      <StatusMessage v-else>{{ he.loading }}</StatusMessage>
    </div>

    <template v-else-if="profile">
      <header class="band">
        <div class="page-width narrow hero-band">
          <ProfileHero :profile="profile" :saved-at="savedProfile?.savedAt" />
        </div>
      </header>

      <div class="page-width narrow content">
        <Card class="p-6">
          <ProfileNameForm
            v-model:title="draft.title"
            v-model:first="draft.first"
            v-model:last="draft.last"
            :form-id="nameFormId"
            :errors="validationErrors"
            :show-errors="isDirty"
            :disabled="isBusy"
            @submit="update"
          />
        </Card>
        <ProfileFacts :profile="profile" />

        <!-- Always mounted: screen readers announce changes to an existing live region, not a new one. -->
        <div aria-live="polite">
          <StatusMessage v-if="feedback" :tone="feedback.tone" :live="false">
            {{ feedback.message }}
            <bdi v-if="feedback.detail" lang="en">{{ feedback.detail }}</bdi>
          </StatusMessage>
        </div>

        <ProfileActions
          :form-id="nameFormId"
          :is-persisted="isPersisted"
          :is-busy="isBusy"
          :is-dirty="isDirty"
          :is-draft-valid="isDraftValid"
          :pending-action="pendingAction"
          @save="save"
          @delete="remove"
          @back="goBack"
        />
      </div>
    </template>

    <div v-else class="page-width narrow not-found">
      <h1>{{ he.notFound.title }}</h1>
      <p>{{ source === ProfileSource.Random ? he.notFound.random : he.notFound.saved }}</p>
      <Button variant="outline" @click="goBack">
        <ChevronLeft class="icon-directional" aria-hidden="true" />
        {{ he.actions.back }}
      </Button>
    </div>
  </article>
</template>

<style scoped>
.narrow {
  max-width: var(--document-width);
}

.hero-band {
  padding-block: var(--space-8);
}

.content {
  /* Overlaps the hero band; positioned so it paints above it. */
  position: relative;
  display: grid;
  gap: var(--space-5);
  margin-block-start: calc(-1 * var(--space-6));
  padding-block-end: var(--space-8);
}

.not-found {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  padding-block: var(--space-8);
}

@media (max-width: 560px) {
  .hero-band {
    padding-block: var(--space-6) var(--space-8);
  }
}
</style>
