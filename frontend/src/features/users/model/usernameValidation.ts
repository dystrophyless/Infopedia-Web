export type UsernameValidationErrorCode =
  | 'required'
  | 'length'
  | 'invalid'
  | 'edge'
  | 'repeated';

const USERNAME_ALLOWED_PATTERN = /^[a-zA-Z0-9_.]+$/;

export function validateUsername(
  username: string,
  { required = false }: { required?: boolean } = {},
): UsernameValidationErrorCode | null {
  if (!username) return required ? 'required' : null;
  if (username.length < 3 || username.length > 20) return 'length';
  if (!USERNAME_ALLOWED_PATTERN.test(username)) return 'invalid';
  if (
    username[0] === '.' ||
    username[0] === '_' ||
    username.at(-1) === '.' ||
    username.at(-1) === '_'
  ) {
    return 'edge';
  }
  if (
    username.includes('..') ||
    username.includes('__') ||
    username.includes('._') ||
    username.includes('_.')
  ) {
    return 'repeated';
  }

  return null;
}
