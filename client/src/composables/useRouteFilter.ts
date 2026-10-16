import { reactive, watch } from 'vue';
import { useRoute, useRouter, type LocationQuery, type LocationQueryValue } from 'vue-router';
import { EMPTY_FILTER, FilterQueryKey, type ProfileFilter } from '@/domain/filter/profileFilter';

function firstString(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' ? first : '';
}

function readFilter(query: LocationQuery): ProfileFilter {
  return { name: firstString(query[FilterQueryKey.Name]), country: firstString(query[FilterQueryKey.Country]) };
}

/**
 * Keeps the list filter in the URL query string (?name=…&country=…).
 * That makes it survive the round trip to the detail screen and back, page
 * reloads, and browser back/forward, and lets a filtered view be shared.
 * A local reactive copy is the input's source of truth, because binding the
 * input directly to the (asynchronously updated) route would drop keystrokes.
 */
export function useRouteFilter() {
  const route = useRoute();
  const router = useRouter();
  const ownRouteName = route.name;
  const filter = reactive<ProfileFilter>(readFilter(route.query));

  // While navigating away, the route already belongs to the next screen; ignore it.
  const isOwnRoute = () => route.name === ownRouteName;

  watch(
    () => route.query,
    (query) => {
      if (!isOwnRoute()) return;
      const next = readFilter(query);
      if (next.name !== filter.name) filter.name = next.name;
      if (next.country !== filter.country) filter.country = next.country;
    },
  );

  watch(
    () => ({ name: filter.name, country: filter.country }),
    ({ name, country }) => {
      if (!isOwnRoute()) return;
      const current = readFilter(route.query);
      if (current.name === name && current.country === country) return;
      // replace, not push: typing must not fill the history with one entry per keystroke.
      void router.replace({
        query: {
          ...route.query,
          [FilterQueryKey.Name]: name || undefined,
          [FilterQueryKey.Country]: country || undefined,
        },
      });
    },
  );

  function clear(): void {
    Object.assign(filter, EMPTY_FILTER);
  }

  return { filter, clear };
}
