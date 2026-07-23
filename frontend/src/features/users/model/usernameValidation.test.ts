import { describe, expect, it } from 'vitest';
import { validateUsername } from './usernameValidation';

describe('validateUsername', () => {
  it.each([
    ['empty optional', '', {}, null],
    ['empty required', '', { required: true }, 'required'],
    ['too short', 'ab', {}, 'length'],
    ['too long', 'a'.repeat(21), {}, 'length'],
    ['unsupported characters', 'user-name', {}, 'invalid'],
    ['leading dot', '.user', {}, 'edge'],
    ['trailing underscore', 'user_', {}, 'edge'],
    ['repeated dots', 'user..name', {}, 'repeated'],
    ['mixed adjacent separators', 'user._name', {}, 'repeated'],
    ['valid username', 'user.name_1', {}, null],
  ])('%s', (_label, username, options, expected) => {
    expect(validateUsername(username, options)).toBe(expected);
  });
});
