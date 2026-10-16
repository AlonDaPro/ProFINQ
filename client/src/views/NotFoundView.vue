<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { en } from '@/i18n/en';
import { RouteName } from '@/router/routeNames';
</script>

<template>
  <section class="page-width not-found">
    <h1>{{ en.notFound.title }}</h1>
    <p>{{ en.notFound.body }}</p>
    <Button as-child variant="outline">
      <RouterLink :to="{ name: RouteName.Home }">{{ en.notFound.home }}</RouterLink>
    </Button>
  </section>
</template>

<style scoped>
.not-found {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  padding-block: var(--space-8);
}
</style>
