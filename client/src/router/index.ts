import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import { APP_NAME } from '@/constants/app';
import { en } from '@/i18n/en';
import HomeView from '@/views/HomeView.vue';
import { parseProfileSource, ProfileSource, RouteName } from './routeNames';

declare module 'vue-router' {
  interface RouteMeta {
    title: string;
  }
}

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function detailProps(route: RouteLocationNormalized) {
  return { source: parseProfileSource(firstParam(route.params.source)), id: firstParam(route.params.id) };
}

// Home is eager (first paint); every other screen is a lazy chunk.
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: RouteName.Home, component: HomeView, meta: { title: APP_NAME } },
    {
      path: '/random',
      name: RouteName.RandomList,
      component: () => import('@/views/RandomProfilesView.vue'),
      meta: { title: en.list.randomTitle },
    },
    {
      path: '/saved',
      name: RouteName.SavedList,
      component: () => import('@/views/SavedProfilesView.vue'),
      meta: { title: en.list.savedTitle },
    },
    {
      // One record for both sources: Save switches /random/:id to /saved/:id on the same
      // record, so the component and its leave guard stay attached.
      path: `/:source(${ProfileSource.Random}|${ProfileSource.Saved})/:id`,
      name: RouteName.ProfileDetail,
      component: () => import('@/views/ProfileDetailView.vue'),
      props: detailProps,
      meta: { title: en.pageTitles.profile },
    },
    {
      path: '/:pathMatch(.*)*',
      name: RouteName.NotFound,
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: en.notFound.title },
    },
  ],
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition;
    // Same screen, new query or source (typing in the filter, Save switching to /saved): stay put.
    if (to.name === from.name) return false;
    return { top: 0 };
  },
});

router.afterEach((to) => {
  document.title = to.meta.title === APP_NAME ? APP_NAME : `${to.meta.title} | ${APP_NAME}`;
});
