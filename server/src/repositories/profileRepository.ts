import type { Profile, ProfileName, SavedProfile } from '../domain/profile/index.js';

/**
 * Every mutating method is a single atomic statement, so callers never need a
 * check-then-act sequence (which would race under concurrent requests).
 * "Not found" / "already exists" are reported as return values; turning them
 * into domain errors is the service's job.
 */
export interface ProfileRepository {
  list(): Promise<SavedProfile[]>;
  findById(id: string): Promise<SavedProfile | null>;
  /** Resolves to `null` when a profile with the same id already exists. */
  insert(profile: Profile): Promise<SavedProfile | null>;
  /** Resolves to `null` when no profile has the given id. */
  updateName(id: string, name: ProfileName): Promise<SavedProfile | null>;
  /** Resolves to `false` when no profile has the given id. */
  delete(id: string): Promise<boolean>;
}
