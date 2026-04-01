/** Normalized reader username: lowercase letters, digits, underscore; 3–30 chars. */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function normalizeUsernameInput(raw: string): string {
  return raw.trim().toLowerCase();
}

export function describeUsernameRules(): string {
  return `${USERNAME_MIN}–${USERNAME_MAX} characters: lowercase letters, numbers, and underscores.`;
}
