import { describe, expect, it } from 'vitest';
import {
  isUsernameConflictErrorResponse,
  resolveUsernameAvailability,
} from './usernameChange';

describe('resolveUsernameAvailability', () => {
  it('allows a case-only change when the case-insensitive endpoint rejects the current username', () => {
    expect(resolveUsernameAvailability('Student_1', 'student_1', false)).toBe(true);
  });

  it('keeps the exact current username disabled', () => {
    expect(resolveUsernameAvailability('Student_1', 'Student_1', false)).toBe(false);
    expect(resolveUsernameAvailability('Student_1', 'Student_1', true)).toBe(false);
  });

  it('does not turn another occupied username into an available one', () => {
    expect(resolveUsernameAvailability('Student_1', 'other_student', false)).toBe(false);
  });
});

describe('isUsernameConflictErrorResponse', () => {
  it('recognizes the backend duplicate-username detail', () => {
    expect(
      isUsernameConflictErrorResponse(400, 'Пользователь с таким username уже существует.'),
    ).toBe(true);
  });

  it('does not classify unrelated 400/409 responses as username conflicts', () => {
    expect(isUsernameConflictErrorResponse(400, 'Некорректные данные')).toBe(false);
    expect(isUsernameConflictErrorResponse(409, 'Конфликт версии профиля')).toBe(false);
    expect(isUsernameConflictErrorResponse(500, 'username already exists')).toBe(false);
  });
});
