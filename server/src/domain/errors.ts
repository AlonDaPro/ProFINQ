import { ErrorCode } from '../constants/errorCode.js';

export type DomainErrorCode = ErrorCode.ProfileNotFound | ErrorCode.ProfileAlreadyExists;

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ProfileNotFoundError extends DomainError {
  readonly code = ErrorCode.ProfileNotFound;

  constructor(readonly profileId: string) {
    super(`Profile "${profileId}" was not found`);
  }
}

export class ProfileAlreadyExistsError extends DomainError {
  readonly code = ErrorCode.ProfileAlreadyExists;

  constructor(readonly profileId: string) {
    super(`Profile "${profileId}" is already saved`);
  }
}
