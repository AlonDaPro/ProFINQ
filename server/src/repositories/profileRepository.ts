import type { Page, PageRequest } from '../domain/pagination.js';
import type { Profile, ProfileDetails, SavedProfile } from '../domain/profile/index.js';

/**
 * Every mutating method is a single atomic statement, so callers never need a check-then-act
 * sequence (which would race under concurrent requests). "Not found" and "already exists" are
 * return values; turning them into domain errors is the service's job.
 */
export interface ProfileRepository {
  /** Newest first, in pages of at most `limit`, narrowed by `request.filter`. */
  listPage(request: PageRequest): Promise<Page<SavedProfile>>;
  /** The distinct countries of saved profiles, alphabetically. */
  listCountries(): Promise<string[]>;
  /** The saved profiles among `ids`; unknown ids are simply absent. */
  findByIds(ids: readonly string[]): Promise<SavedProfile[]>;
  findById(id: string): Promise<SavedProfile | null>;
  /** Resolves to `null` when a profile with the same id already exists. */
  insert(profile: Profile): Promise<SavedProfile | null>;
  /** Resolves to `null` when no profile has the given id. */
  update(id: string, details: ProfileDetails): Promise<SavedProfile | null>;
  /** Resolves to `false` when no profile has the given id. */
  delete(id: string): Promise<boolean>;
}
