export const PROFILE_ID_MAX_LENGTH = 64;
export const TITLE_MAX_LENGTH = 20;
export const NAME_PART_MAX_LENGTH = 50;
export const GENDER_MAX_LENGTH = 20;
/** RFC 5321 limit for a forward path. */
export const EMAIL_MAX_LENGTH = 254;
export const PHONE_MAX_LENGTH = 40;
export const URL_MAX_LENGTH = 2048;
export const ADDRESS_PART_MAX_LENGTH = 200;
export const COUNTRY_MAX_LENGTH = 100;

export const PROFILE_ID_PATTERN = /^[A-Za-z0-9-]+$/;
/**
 * Deliberately loose: the email is read-only data copied from randomuser.me, not user input.
 * Real records such as "hans-j..diederich@example.com" fail strict RFC checks, and rejecting
 * them would make Save fail for those people. We only guard the shape.
 */
export const EMAIL_SHAPE_PATTERN = /^[^\s@]+@[^\s@]+$/;
export const SECURE_URL_PROTOCOL = 'https:';
