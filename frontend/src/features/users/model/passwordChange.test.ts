import { describe, expect, it } from 'vitest';
import {
  classifyPasswordChangeError,
  createInitialMobilePasswordState,
  openPasswordSettingsView,
  transitionMobilePassword,
  validateCurrentPassword,
  validateNewPassword,
  validatePasswordConfirmation,
} from './passwordChange';

describe('validateCurrentPassword', () => {
  it.each([
    ['', 'required'],
    ['a'.repeat(7), 'too-short'],
    ['a'.repeat(8), null],
    ['пароль123', null],
  ])('validates current password %j', (password, expected) => {
    expect(validateCurrentPassword(password)).toBe(expected);
  });
});

describe('validateNewPassword', () => {
  it.each([
    ['', 'required'],
    ['a'.repeat(7), 'too-short'],
    ['a'.repeat(8), null],
    ['a'.repeat(128), null],
    ['a'.repeat(129), 'too-long'],
    ['abc12345é', 'invalid-characters'],
    ['abc1234\n', 'invalid-characters'],
    ['abc 12345', 'invalid-characters'],
    ['Abc123!@', null],
  ])('validates new password %j', (password, expected) => {
    expect(validateNewPassword(password)).toBe(expected);
  });
});

describe('validatePasswordConfirmation', () => {
  it('accepts an exact match', () => {
    expect(validatePasswordConfirmation('Abc123!@', 'Abc123!@')).toBeNull();
  });

  it('rejects a mismatch', () => {
    expect(validatePasswordConfirmation('Abc123!@', 'Abc123!?')).toBe('mismatch');
  });
});

describe('classifyPasswordChangeError', () => {
  it.each([
    [400, 'Неверный текущий пароль.', 'wrong-current'],
    [400, 'Парольный вход не настроен.', 'password-not-configured'],
    [400, 'Неверный текущий пароль', 'generic'],
    [401, 'Неверный текущий пароль.', 'generic'],
    [400, { detail: 'Неверный текущий пароль.' }, 'generic'],
    [500, undefined, 'generic'],
  ])('classifies status/detail strictly', (status, detail, expected) => {
    expect(classifyPasswordChangeError(status, detail)).toBe(expected);
  });
});

describe('transitionMobilePassword', () => {
  const validCurrent = 'Current1!';
  const validNew = 'Newpass1!';

  it('starts create mode directly on new and confirm fields', () => {
    const state = createInitialMobilePasswordState('create');
    expect(state).toMatchObject({ mode: 'create', step: 'new', currentPassword: '', newPassword: '', confirmPassword: '' });
    expect(transitionMobilePassword(state, { type: 'continue' })).toEqual({ state });
    expect(transitionMobilePassword(state, { type: 'current-change', value: validCurrent })).toEqual({ state });
  });

  it('emits create-password with only the new password and locks duplicate submits', () => {
    let state = createInitialMobilePasswordState('create');
    state = transitionMobilePassword(state, { type: 'new-change', value: validNew }).state;
    state = transitionMobilePassword(state, { type: 'confirm-change', value: validNew }).state;
    const result = transitionMobilePassword(state, { type: 'submit' });
    expect(result.command).toEqual({ type: 'create-password', newPassword: validNew, requestId: 1 });
    expect(result.command).not.toHaveProperty('currentPassword');
    expect(result.command).not.toHaveProperty('verify');
    expect(result.state.submitting).toBe(true);
    expect(transitionMobilePassword(result.state, { type: 'submit' })).toEqual({ state: result.state });
  });

  it('handles create conflict as a safe distinguishable terminal error without retrying overwrite', () => {
    const state = {
      ...createInitialMobilePasswordState('create'),
      newPassword: validNew,
      confirmPassword: validNew,
      showNew: true,
      showConfirm: true,
      submitting: true,
      submissionRequestId: 4,
    };
    const result = transitionMobilePassword(state, {
      type: 'submit-failure',
      requestId: 4,
      status: 409,
      detail: { code: 'password_already_configured', message: 'secret backend text' },
    });
    expect(result.command).toBeUndefined();
    expect(result.state).toMatchObject({ mode: 'create', step: 'new', apiError: 'password-already-configured', submitting: false, newPassword: '', confirmPassword: '', showNew: false, showConfirm: false });
    expect(JSON.stringify(result.state)).not.toContain('secret backend text');
    expect(transitionMobilePassword(result.state, { type: 'submit' }).command).toBeUndefined();
  });

  it('scrubs create secrets and visibility on success, including stale response protection', () => {
    const state = {
      ...createInitialMobilePasswordState('create'),
      newPassword: validNew,
      confirmPassword: validNew,
      showNew: true,
      showConfirm: true,
      submitting: true,
      submissionRequestId: 3,
    };
    expect(transitionMobilePassword(state, { type: 'submit-success', requestId: 2 })).toEqual({ state });
    const result = transitionMobilePassword(state, { type: 'submit-success', requestId: 3 }).state;
    expect(result).toMatchObject({ mode: 'create', step: 'new', success: true, submitting: false, newPassword: '', confirmPassword: '', showNew: false, showConfirm: false });
  });

  it('scrubs create secrets after an unclassified failure', () => {
    const state = {
      ...createInitialMobilePasswordState('create'),
      newPassword: validNew,
      confirmPassword: validNew,
      showNew: true,
      showConfirm: true,
      submitting: true,
      submissionRequestId: 1,
    };
    const result = transitionMobilePassword(state, { type: 'submit-failure', requestId: 1, status: 503, detail: 'opaque' }).state;
    expect(result).toMatchObject({ mode: 'create', step: 'new', apiError: 'generic', submitting: false, newPassword: '', confirmPassword: '', showNew: false, showConfirm: false });
  });

  it('opens password settings and waits for server verification before entering new step', () => {
    expect(openPasswordSettingsView()).toBe('password');
    let result = transitionMobilePassword(createInitialMobilePasswordState(), {
      type: 'current-change',
      value: validCurrent,
    });
    result = transitionMobilePassword(result.state, { type: 'continue' });
    expect(result.command).toEqual({ type: 'verify-current', currentPassword: validCurrent, requestId: 1 });
    expect(result.state.step).toBe('current');
    expect(result.state.verifying).toBe(true);
    expect(transitionMobilePassword(result.state, { type: 'verify-succeeded', requestId: 1 }).state.step).toBe('new');
    expect(result.state.submitting).toBe(false);
  });

  it('emits one command for valid submit and locks the flow', () => {
    let state = createInitialMobilePasswordState();
    state = transitionMobilePassword(state, { type: 'current-change', value: validCurrent }).state;
    const verification = transitionMobilePassword(state, { type: 'continue' });
    state = transitionMobilePassword(verification.state, { type: 'verify-succeeded', requestId: 1 }).state;
    state = transitionMobilePassword(state, { type: 'new-change', value: validNew }).state;
    state = transitionMobilePassword(state, { type: 'confirm-change', value: validNew }).state;
    const result = transitionMobilePassword(state, { type: 'submit' });
    expect(result.state.submitting).toBe(true);
    expect(result.command).toEqual({ type: 'change-password', currentPassword: validCurrent, newPassword: validNew, requestId: 1 });
    expect(transitionMobilePassword(result.state, { type: 'submit' })).toEqual({ state: result.state });
  });

  it('scrubs all secrets and visibility on success', () => {
    const state = {
      ...createInitialMobilePasswordState(),
      step: 'new' as const,
      currentPassword: validCurrent,
      newPassword: validNew,
      confirmPassword: validNew,
      showCurrent: true,
      showNew: true,
      showConfirm: true,
      submitting: true,
      errors: { confirm: 'mismatch' as const },
      apiError: 'generic' as const,
    };
    const result = transitionMobilePassword(state, { type: 'submit-success' }).state;
    expect(result).toMatchObject({ step: 'current', currentPassword: '', newPassword: '', confirmPassword: '', showCurrent: false, showNew: false, showConfirm: false, errors: {}, apiError: null, submitting: false, success: true });
  });

  it.each([
    [400, 'Неверный текущий пароль.', 'wrong-current', true],
    [400, 'Парольный вход не настроен.', 'password-not-configured', true],
    [429, 'rate limited', 'generic', false],
    [500, undefined, 'generic', false],
    [undefined, undefined, 'generic', false],
  ] as const)('handles verification failure without storing detail', (status, detail, expected, scrubbed) => {
    const state = { ...createInitialMobilePasswordState(), currentPassword: validCurrent, verifying: true, verificationRequestId: 1 };
    const result = transitionMobilePassword(state, { type: 'verify-failed', requestId: 1, status, detail }).state;
    expect(result.apiError).toBe(expected);
    expect(result.step).toBe('current');
    expect(result.verifying).toBe(false);
    expect(result.currentPassword).toBe(scrubbed ? '' : validCurrent);
    expect(JSON.stringify(result)).not.toContain('rate limited');
  });

  it('ignores stale verification resolutions and locks edits while verifying', () => {
    let state = { ...createInitialMobilePasswordState(), currentPassword: validCurrent };
    const pending = transitionMobilePassword(state, { type: 'continue' });
    state = pending.state;
    expect(transitionMobilePassword(state, { type: 'current-change', value: 'other' })).toEqual({ state });
    expect(transitionMobilePassword(state, { type: 'toggle-current-visibility' })).toEqual({ state });
    expect(transitionMobilePassword(state, { type: 'verify-succeeded', requestId: 99 })).toEqual({ state });
    state = transitionMobilePassword(state, { type: 'verify-succeeded', requestId: 1 }).state;
    expect(state.step).toBe('new');
  });

  it.each([
    [400, 'Неверный текущий пароль.', 'wrong-current', true],
    [400, 'Парольный вход не настроен.', 'password-not-configured', true],
    [400, 'Неверный текущий пароль', 'generic', false],
    [500, { detail: 'Неверный текущий пароль.' }, 'generic', false],
    [undefined, undefined, 'generic', false],
  ] as const)('handles submit failure %s/%s', (status, detail, expected, scrubbed) => {
    const state = { ...createInitialMobilePasswordState(), step: 'new' as const, currentPassword: validCurrent, newPassword: validNew, confirmPassword: validNew, submitting: true };
    const result = transitionMobilePassword(state, { type: 'submit-failure', status, detail }).state;
    expect(result.apiError).toBe(expected);
    expect(result.submitting).toBe(false);
    expect(result.step).toBe(scrubbed ? 'current' : 'new');
    expect(result.currentPassword).toBe(scrubbed ? '' : validCurrent);
    expect(result.newPassword).toBe(scrubbed ? '' : validNew);
    expect(JSON.stringify(result)).not.toContain('Неверный');
  });

  it('backs to current while preserving current and clearing new fields', () => {
    const state = { ...createInitialMobilePasswordState(), step: 'new' as const, currentPassword: validCurrent, newPassword: validNew, confirmPassword: validNew, showNew: true, showConfirm: true, errors: { next: 'too-short' as const } };
    const result = transitionMobilePassword(state, { type: 'back-to-current' }).state;
    expect(result).toMatchObject({ step: 'current', currentPassword: validCurrent, newPassword: '', confirmPassword: '', showNew: false, showConfirm: false, errors: {}, apiError: null });
  });

  it('requires a fresh verification after backing from new step', () => {
    const state = { ...createInitialMobilePasswordState(), step: 'new' as const, currentPassword: validCurrent };
    const currentState = transitionMobilePassword(state, { type: 'back-to-current' }).state;
    const result = transitionMobilePassword(currentState, { type: 'continue' });
    expect(result.state.step).toBe('current');
    expect(result.state.verifying).toBe(true);
    expect(result.command).toMatchObject({ type: 'verify-current', currentPassword: validCurrent, requestId: 1 });
  });

  it('scrubs and emits close, resets to a fresh state, and ignores actions while submitting', () => {
    const state = { ...createInitialMobilePasswordState(), currentPassword: validCurrent, submitting: true };
    expect(transitionMobilePassword(state, { type: 'current-change', value: 'other' })).toEqual({ state });
    expect(transitionMobilePassword(state, { type: 'close' })).toEqual({ state });
    const closed = transitionMobilePassword(state, { type: 'submit-success' });
    expect(closed.state).toMatchObject({ currentPassword: '', newPassword: '', confirmPassword: '', submitting: false });
    expect(transitionMobilePassword(state, { type: 'close' }).command).toBeUndefined();
    expect(transitionMobilePassword(createInitialMobilePasswordState(), { type: 'close' }).command).toEqual({ type: 'close' });
    expect(transitionMobilePassword(state, { type: 'reset' })).toEqual({ state });
    expect(transitionMobilePassword({ ...state, submitting: false, currentPassword: validCurrent }, { type: 'reset' }).state).toEqual(createInitialMobilePasswordState());
  });
});
