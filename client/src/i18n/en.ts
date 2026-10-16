import { Gender } from '@/domain/profile';

/** English copy for every screen except the profile detail (see he.ts). */
export const en = {
  genders: { [Gender.Male]: 'Male', [Gender.Female]: 'Female' } satisfies Record<Gender, string>,
  pageTitles: { profile: 'Profile' },
  nav: { label: 'Main', random: 'Random', history: 'History', skipToContent: 'Skip to content' },
  home: {
    title: 'Meet ten random people. Keep the ones you like.',
    lead: 'Each fetch brings ten new people from randomuser.me. Open anyone to fix their name or save them.',
    fetch: 'Fetch',
    history: 'History',
    savedCount: (count: number, hasMore: boolean) => `${count}${hasMore ? '+' : ''} saved`,
    stepsLabel: 'How it works',
    steps: {
      fetch: { title: 'Fetch ten people', body: 'A fresh batch from randomuser.me every time you press Fetch.' },
      save: {
        title: 'Fix a name, save them',
        body: 'Edits stay in the list until you save the person to the database.',
      },
      history: {
        title: 'Find them in History',
        body: 'Saved people are there after a reload, ready to rename or delete.',
      },
    },
  },
  about: {
    title: 'A small app, built like a real one.',
    body: 'Profinq is a full-stack home assignment. The Vue client fetches people from randomuser.me, and the ones you keep go through a Node API into PostgreSQL. The profile screen is Hebrew and right-to-left, while names, emails and phone numbers stay left-to-right.',
    stack: [
      {
        term: 'Client',
        detail: 'Vue 3, TypeScript, Pinia and Vue Router, with shadcn-vue components on Tailwind CSS.',
      },
      { term: 'Server', detail: 'Node, Express 5 and PostgreSQL, with every request validated by zod.' },
      { term: 'Tests', detail: 'Unit, API and Playwright end-to-end suites, run in CI on every push.' },
    ],
    credit: 'Designed and built by',
    source: 'View the source on GitHub',
  },
  list: {
    randomTitle: 'Random people',
    savedTitle: 'Saved profiles',
    randomSource: 'From randomuser.me',
    savedSource: 'Saved in the database',
    fetchNewBatch: 'Fetch new batch',
    randomEmpty: 'randomuser.me returned no people. Fetch a new batch.',
    savedEmpty: 'No saved profiles yet. Fetch some people and save the ones you like.',
    noMatches: 'No one matches these filters.',
    clearFilters: 'Clear filters',
    retry: 'Try again',
    loading: 'Loading people',
    savedBadge: 'Saved',
    count: (count: number, hasMore = false) =>
      hasMore ? `${count}+ people` : `${count} ${count === 1 ? 'person' : 'people'}`,
    filteredCount: (visible: number, total: number, hasMore = false) =>
      hasMore ? `${visible} of the first ${total}` : `${visible} of ${total}`,
    showMore: 'Show more',
    loadingMore: 'Loading more…',
    loadMoreFailed: 'Could not load more profiles.',
    columns: { name: 'Name', gender: 'Gender', country: 'Country', phone: 'Phone', email: 'Email' },
  },
  filters: {
    label: 'Filter profiles',
    name: 'Name',
    namePlaceholder: 'Search by name',
    country: 'Country',
    allCountries: 'All countries',
  },
  notFound: { title: 'Page not found', body: 'That address does not match any page.', home: 'Go home' },
} as const;
