import type { RouteLocationRaw } from 'vue-router';
import { enumLookup } from '@/lib/enumLookup';

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

const toProfileSource = enumLookup(Object.values(ProfileSource));

/** The route pattern already restricts the param; this narrows it to the enum. */
export function parseProfileSource(param: string): ProfileSource {
  return toProfileSource(param) ?? ProfileSource.Random;
}

/** A route param or query value may repeat (`?a=1&a=2`) or be null (`?a`); the first string wins. */
export function firstValue(value: string | null | (string | null)[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? '';
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
