import { getPasswordValidationError } from '../../../utils/passwordValidation';

/** Stable, translation-independent validation and API error codes for password changes. */
export type PasswordValidationErrorCode =
  | 'required'
  | 'too-short'
  | 'too-long'
  | 'invalid-characters';

export type PasswordConfirmationErrorCode = 'mismatch';

export type PasswordChangeApiErrorCode =
  | 'wrong-current'
  | 'password-not-configured'
  | 'password-already-configured'
  | 'generic';

export type MobilePasswordMode = 'change' | 'create';
export type MobilePasswordStep = 'current' | 'new';
export type MobilePasswordSettingsView = 'home' | 'account' | 'email' | 'username' | 'password';
export type MobilePasswordFieldErrors = {
  current?: PasswordValidationErrorCode;
  next?: PasswordValidationErrorCode;
  confirm?: PasswordConfirmationErrorCode;
};

export interface MobilePasswordState {
  mode: MobilePasswordMode;
  step: MobilePasswordStep;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrent: boolean;
  showNew: boolean;
  showConfirm: boolean;
  errors: MobilePasswordFieldErrors;
  apiError: PasswordChangeApiErrorCode | null;
  success: boolean;
  verifying: boolean;
  submitting: boolean;
  verificationRequestId: number;
  submissionRequestId: number;
}

export type MobilePasswordCommand =
  | { type: 'verify-current'; currentPassword: string; requestId: number }
  | { type: 'change-password'; currentPassword: string; newPassword: string; requestId: number }
  | { type: 'create-password'; newPassword: string; requestId: number }
  | { type: 'close' };

export type MobilePasswordAction =
  | { type: 'current-change'; value: string }
  | { type: 'new-change'; value: string }
  | { type: 'confirm-change'; value: string }
  | { type: 'toggle-current-visibility' }
  | { type: 'toggle-new-visibility' }
  | { type: 'toggle-confirm-visibility' }
  | { type: 'continue' }
  | { type: 'submit' }
  | { type: 'verify-succeeded'; requestId?: number }
  | { type: 'verify-failed'; requestId?: number; status?: number; detail?: unknown }
  | { type: 'submit-success'; requestId?: number }
  | { type: 'submit-failure'; requestId?: number; status?: number; detail?: unknown }
  | { type: 'back-to-current' }
  | { type: 'close' }
  | { type: 'reset' };

export interface MobilePasswordTransition {
  state: MobilePasswordState;
  command?: MobilePasswordCommand;
}

export function createInitialMobilePasswordState(mode: MobilePasswordMode = 'change'): MobilePasswordState {
  return {
    mode,
    step: mode === 'create' ? 'new' : 'current',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrent: false,
    showNew: false,
    showConfirm: false,
    errors: {},
    apiError: null,
    success: false,
    verifying: false,
    submitting: false,
    verificationRequestId: 0,
    submissionRequestId: 0,
  };
}

export function openPasswordSettingsView(): MobilePasswordSettingsView {
  return 'password';
}

export function validateCurrentPassword(password: string): PasswordValidationErrorCode | null {
  if (!password) return 'required';
  if (password.length < 8) return 'too-short';
  return null;
}

export function validateNewPassword(password: string): PasswordValidationErrorCode | null {
  if (password.length > 128) return 'too-long';

  // Reuse the shared validator so this model stays aligned with registration
  // and reset-password flows (printable ASCII except space).
  const baseError = getPasswordValidationError(password, (key) => key);
  if (baseError === 'auth.passwordRequired') return 'required';
  if (baseError === 'auth.passwordTooShort') return 'too-short';
  if (baseError === 'auth.passwordLatinOnly') return 'invalid-characters';
  return null;
}

export function validatePasswordConfirmation(
  newPassword: string,
  confirmation: string,
): PasswordConfirmationErrorCode | null {
  return newPassword === confirmation ? null : 'mismatch';
}

/** Classify only the two documented backend details; never expose arbitrary details. */
export function classifyPasswordChangeError(
  status: number | undefined,
  detail: unknown,
): PasswordChangeApiErrorCode {
  if (
    (status === 409 || status === 400) &&
    typeof detail === 'object' &&
    detail !== null &&
    'code' in detail &&
    (detail as { code?: unknown }).code === 'password_already_configured'
  ) {
    return 'password-already-configured';
  }
  if (status === 400 && detail === 'Неверный текущий пароль.') return 'wrong-current';
  if (status === 400 && detail === 'Парольный вход не настроен.') {
    return 'password-not-configured';
  }
  return 'generic';
}

function scrubSecrets(state: MobilePasswordState): MobilePasswordState {
  return {
    ...state,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrent: false,
    showNew: false,
    showConfirm: false,
  };
}

function withIdleState(state: MobilePasswordState): MobilePasswordState {
  return { ...state, submitting: false };
}

function terminalStep(state: MobilePasswordState): MobilePasswordStep {
  return state.mode === 'create' ? 'new' : 'current';
}

/** Pure state machine for the mobile two-step password flow. */
export function transitionMobilePassword(
  state: MobilePasswordState,
  action: MobilePasswordAction,
): MobilePasswordTransition {
  const resolution = action.type === 'verify-succeeded' || action.type === 'verify-failed' || action.type === 'submit-success' || action.type === 'submit-failure';
  if ((state.verifying || state.submitting) && !resolution) return { state };

  switch (action.type) {
    case 'current-change':
      if (state.mode === 'create') return { state };
      return { state: { ...state, currentPassword: action.value, errors: {}, apiError: null, success: false } };
    case 'new-change':
      {
        const { next: _next, ...remainingErrors } = state.errors;
        return { state: { ...state, newPassword: action.value, errors: remainingErrors, apiError: null, success: false } };
      }
    case 'confirm-change':
      {
        const { confirm: _confirm, ...remainingErrors } = state.errors;
        return { state: { ...state, confirmPassword: action.value, errors: remainingErrors, apiError: null, success: false } };
      }
    case 'toggle-current-visibility':
      if (state.mode === 'create') return { state };
      return { state: { ...state, showCurrent: !state.showCurrent } };
    case 'toggle-new-visibility':
      return { state: { ...state, showNew: !state.showNew } };
    case 'toggle-confirm-visibility':
      return { state: { ...state, showConfirm: !state.showConfirm } };
    case 'continue': {
      if (state.mode === 'create' || state.step !== 'current') return { state };
      const current = validateCurrentPassword(state.currentPassword);
      if (current) return { state: { ...state, errors: { current }, apiError: null, success: false } };
      const requestId = state.verificationRequestId + 1;
      return {
        state: { ...state, errors: {}, apiError: null, success: false, verifying: true, verificationRequestId: requestId },
        command: { type: 'verify-current', currentPassword: state.currentPassword, requestId },
      };
    }
    case 'submit': {
      if (state.step !== 'new') return { state };
      const next = validateNewPassword(state.newPassword);
      const confirm = validatePasswordConfirmation(state.newPassword, state.confirmPassword);
      const errors: MobilePasswordFieldErrors = {
        ...(next ? { next } : {}),
        ...(confirm ? { confirm } : {}),
      };
      if (next || confirm) return { state: { ...state, errors, apiError: null, success: false } };
      const requestId = state.submissionRequestId + 1;
      const command: MobilePasswordCommand = state.mode === 'create'
        ? { type: 'create-password', newPassword: state.newPassword, requestId }
        : { type: 'change-password', currentPassword: state.currentPassword, newPassword: state.newPassword, requestId };
      return {
        state: { ...state, errors: {}, apiError: null, success: false, submitting: true, submissionRequestId: requestId },
        command,
      };
    }
    case 'verify-succeeded':
      if (!state.verifying || (action.requestId !== undefined && action.requestId !== state.verificationRequestId)) return { state };
      return { state: { ...state, step: 'new', verifying: false, errors: {}, apiError: null, success: false } };
    case 'verify-failed': {
      if (!state.verifying || (action.requestId !== undefined && action.requestId !== state.verificationRequestId)) return { state };
      const apiError = classifyPasswordChangeError(action.status, action.detail);
      if (apiError === 'generic') return { state: { ...state, verifying: false, errors: {}, apiError, success: false } };
      return { state: { ...scrubSecrets(state), step: 'current', errors: {}, apiError, success: false, verifying: false, submitting: false } };
    }
    case 'submit-success':
      if (!state.submitting || (action.requestId !== undefined && action.requestId !== state.submissionRequestId)) return { state };
      return { state: { ...scrubSecrets(state), step: terminalStep(state), errors: {}, apiError: null, success: true, submitting: false } };
    case 'submit-failure': {
      if (!state.submitting || (action.requestId !== undefined && action.requestId !== state.submissionRequestId)) return { state };
      const apiError = classifyPasswordChangeError(action.status, action.detail);
      if (apiError === 'generic') {
        if (state.mode === 'create') {
          return { state: { ...scrubSecrets(state), step: 'new', apiError, errors: {}, success: false, submitting: false } };
        }
        return { state: withIdleState({ ...state, apiError, errors: {} }) };
      }
      return { state: { ...scrubSecrets(state), step: terminalStep(state), errors: {}, apiError, success: false, submitting: false } };
    }
    case 'back-to-current':
      if (state.mode === 'create') return { state };
      return { state: { ...state, step: 'current', newPassword: '', confirmPassword: '', showNew: false, showConfirm: false, errors: {}, apiError: null, success: false } };
    case 'close':
      return { state: createInitialMobilePasswordState(state.mode), command: { type: 'close' } };
    case 'reset':
      return { state: createInitialMobilePasswordState(state.mode) };
  }
}
