const LATIN_KEYBOARD_PASSWORD_PATTERN = /^[\x21-\x7E]+$/;

export function getPasswordValidationError(
  password: string,
  t: (key: string) => string
): string | undefined {
  if (!password) {
    return t('auth.passwordRequired');
  }

  if (password.length < 8) {
    return t('auth.passwordTooShort');
  }

  if (!LATIN_KEYBOARD_PASSWORD_PATTERN.test(password)) {
    return t('auth.passwordLatinOnly');
  }

  return undefined;
}
