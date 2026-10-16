import { ProfileAlreadyExistsError, ProfileNotFoundError } from '../domain/errors.js';
import type { Profile, ProfileName, SavedProfile } from '../domain/profile/index.js';
import type { ProfileRepository } from '../repositories/profileRepository.js';

export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  list(): Promise<SavedProfile[]> {
    return this.repository.list();
  }

  async getById(id: string): Promise<SavedProfile> {
    const profile = await this.repository.findById(id);
    if (!profile) {
      throw new ProfileNotFoundError(id);
    }
    return profile;
  }

  async save(profile: Profile): Promise<SavedProfile> {
    const saved = await this.repository.insert(profile);
    if (!saved) {
      throw new ProfileAlreadyExistsError(profile.id);
    }
    return saved;
  }

  async rename(id: string, name: ProfileName): Promise<SavedProfile> {
    const updated = await this.repository.updateName(id, name);
    if (!updated) {
      throw new ProfileNotFoundError(id);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new ProfileNotFoundError(id);
    }
  }
}
