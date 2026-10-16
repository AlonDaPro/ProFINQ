import { ProfileAlreadyExistsError, ProfileNotFoundError } from '../domain/errors.js';
import type { Page, PageRequest } from '../domain/pagination.js';
import type { Profile, ProfileDetails, SavedProfile } from '../domain/profile/index.js';
import type { ProfileRepository } from '../repositories/profileRepository.js';

export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  listPage(request: PageRequest): Promise<Page<SavedProfile>> {
    return this.repository.listPage(request);
  }

  findByIds(ids: readonly string[]): Promise<SavedProfile[]> {
    return this.repository.findByIds(ids);
  }

  async getById(id: string): Promise<SavedProfile> {
    const profile = await this.repository.findById(id);
    if (!profile) throw new ProfileNotFoundError(id);
    return profile;
  }

  async save(profile: Profile): Promise<SavedProfile> {
    const saved = await this.repository.insert(profile);
    if (!saved) throw new ProfileAlreadyExistsError(profile.id);
    return saved;
  }

  async update(id: string, details: ProfileDetails): Promise<SavedProfile> {
    const updated = await this.repository.update(id, details);
    if (!updated) throw new ProfileNotFoundError(id);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new ProfileNotFoundError(id);
  }
}
