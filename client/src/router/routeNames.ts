import type { RouteLocationRaw } from 'vue-router';

export enum RouteName {
  Home = 'home',
  RandomList = 'random-list',
  SavedList = 'saved-list',
  ProfileDetail = 'profile-detail',
  NotFound = 'not-found',
}

/** Which list a profile detail was opened from: decides where Back leads and the not-found copy. */
export enum ProfileSource {
  Random = 'random',
  Saved = 'saved',
}

const SOURCES_BY_PARAM: ReadonlyMap<string, ProfileSource> = new Map(
  Object.values(ProfileSource).map((source) => [source, source]),
);

/** The route pattern already restricts the param; this narrows it to the enum. */
export function parseProfileSource(param: string): ProfileSource {
  return SOURCES_BY_PARAM.get(param) ?? ProfileSource.Random;
}

const LIST_ROUTE: Readonly<Record<ProfileSource, RouteName>> = {
  [ProfileSource.Random]: RouteName.RandomList,
  [ProfileSource.Saved]: RouteName.SavedList,
};

export function listRouteFor(source: ProfileSource): RouteLocationRaw {
  return { name: LIST_ROUTE[source] };
}

export function detailRouteFor(source: ProfileSource, id: string): RouteLocationRaw {
  return { name: RouteName.ProfileDetail, params: { source, id } };
}
