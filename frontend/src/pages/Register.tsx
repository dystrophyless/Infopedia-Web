import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { startGoogleAuth, startRegistration, verifyEmail } from '../api/auth';
import {
  AuthDivider,
  AuthEmailInput,
  AuthPasswordInput,
  AuthShell,
  AuthSubmit,
  GoogleAuthButton,
} from '../components/AuthShell';

type RegisterStep = 'account' | 'code';
type AccountFieldErrors = {
  email?: string;
  password?: string;
};

const RESEND_COOLDOWN_SECONDS = 60;

function getErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err) && err.response?.data) {
    const detail = (err.response.data as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof detail.message === 'string'
    ) {
      return detail.message;
    }
  }
  return fallback;
}

export function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const [step, setStep] = useState<RegisterStep>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [accountFieldErrors, setAccountFieldErrors] = useState<AccountFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastAutoSubmittedCode = useRef('');

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (step !== 'code' || loading || !/^\d{6}$/.test(code)) return;
    if (lastAutoSubmittedCode.current === code) return;

    lastAutoSubmittedCode.current = code;
    void submitVerification(code);
  }, [code, loading, step]);

  if (isAuthenticated) {
    return (
      <Navigate
        to={user?.onboarding_completed === true ? '/profile' : '/onboarding'}
        replace
      />
    );
  }

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setAccountFieldErrors({});

    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors: AccountFieldErrors = {};

    if (!normalizedEmail) {
      nextErrors.email = t('auth.emailRequired');
    }
    if (!password) {
      nextErrors.password = t('auth.passwordRequired');
    } else if (password.length < 8) {
      nextErrors.password = t('auth.passwordTooShort');
    }

    if (nextErrors.email || nextErrors.password) {
      setAccountFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      await startRegistration({ email: normalizedEmail, password });
      setEmail(normalizedEmail);
      setStep('code');
      setCode('');
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setNotice(t('auth.codeSent'));
    } catch (err) {
      setAccountFieldErrors({
        email: getErrorMessage(err, t('auth.registrationFailed')),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const normalizedCode = code.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError(t('auth.invalidCode'));
      return;
    }

    lastAutoSubmittedCode.current = normalizedCode;
    await submitVerification(normalizedCode);
  }

  async function submitVerification(normalizedCode: string) {
    setLoading(true);
    try {
      const tokens = await verifyEmail({ email, code: normalizedCode });
      setAuth(tokens.access_token, tokens.refresh_token);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, t('auth.verificationFailed')));
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(value: string) {
    const normalizedCode = value.replace(/\D/g, '').slice(0, 6);
    if (normalizedCode.length < 6) {
      lastAutoSubmittedCode.current = '';
    }
    setCode(normalizedCode);
  }

  async function handleResendCode() {
    setError(null);
    setNotice(null);
    if (!email || !password || resendSeconds > 0) return;

    setLoading(true);
    try {
      await startRegistration({ email, password });
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setNotice(t('auth.codeResent'));
    } catch (err) {
      setError(getErrorMessage(err, t('auth.resendFailed')));
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleAuth() {
    startGoogleAuth('/onboarding');
  }

  return (
    <AuthShell
      title={step === 'account' ? t('auth.registerTitle') : t('auth.verifyTitle')}
      footer={
        step === 'account' ? (
          <>
            {t('auth.haveAccount')}{' '}
            <Link to="/login" className="text-accent hover:underline">
              {t('auth.signIn')}
            </Link>
          </>
        ) : undefined
      }
    >
      {step === 'account' ? (
        <form onSubmit={handleAccountSubmit} noValidate>
          <p className="mb-5 max-w-full break-words text-[15px] leading-snug text-text-body">
            {t('auth.registerHelper')}
          </p>
          <AuthEmailInput
            label={t('auth.email')}
            value={email}
            onChange={(value) => {
              setEmail(value);
              setAccountFieldErrors((errors) => ({ ...errors, email: undefined }));
            }}
            error={accountFieldErrors.email}
          />
          <AuthPasswordInput
            label={t('auth.password')}
            value={password}
            visible={showPassword}
            onChange={(value) => {
              setPassword(value);
              setAccountFieldErrors((errors) => ({ ...errors, password: undefined }));
            }}
            onToggle={() => setShowPassword((visible) => !visible)}
            toggleLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            autoComplete="new-password"
            error={accountFieldErrors.password}
          />
          <AuthSubmit loading={loading}>
            {loading ? t('common.loading') : t('auth.sendCodeButton')}
          </AuthSubmit>
          <AuthDivider label={t('auth.or')} />
          <GoogleAuthButton onClick={handleGoogleAuth}>
            {t('auth.continueWithGoogle')}
          </GoogleAuthButton>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit} noValidate>
          <p className="mb-5 max-w-full break-words text-[15px] leading-snug text-text-body">
            {t('auth.verifyHelper', { email })}
          </p>
          <VerificationCodeInput
            label={t('auth.verificationCode')}
            value={code}
            onChange={handleCodeChange}
          />
          <FormMessage error={error} notice={notice} />
          <AuthSubmit loading={loading}>
            {loading ? t('common.loading') : t('auth.verifyButton')}
          </AuthSubmit>
          <div className="mt-4 flex justify-center text-[14px]">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={loading || resendSeconds > 0}
              className="text-accent hover:underline disabled:text-muted disabled:no-underline"
            >
              {resendSeconds > 0
                ? t('auth.resendIn', { seconds: resendSeconds })
                : t('auth.resendCode')}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

function VerificationCodeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const cells = Array.from({ length: 6 }, (_, index) => value[index] ?? '');

  function updateDigit(index: number, nextDigit: string) {
    const digits = cells.slice();
    digits[index] = nextDigit;
    onChange(digits.join(''));
  }

  function handleDigitChange(index: number, nextValue: string) {
    const digits = nextValue.replace(/\D/g, '');
    if (!digits) {
      updateDigit(index, '');
      return;
    }

    if (digits.length === 1) {
      updateDigit(index, digits);
      inputRefs.current[Math.min(index + 1, 5)]?.focus();
      return;
    }

    const nextCells = cells.slice();
    digits
      .slice(0, 6 - index)
      .split('')
      .forEach((digit, offset) => {
        nextCells[index + offset] = digit;
      });
    onChange(nextCells.join(''));
    inputRefs.current[Math.min(index + digits.length, 5)]?.focus();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !cells[index] && index > 0) {
      event.preventDefault();
      updateDigit(index - 1, '');
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  return (
    <label className="mb-4 block text-[14px] font-medium text-text-body">
      <span className="sr-only">{label}</span>
      <span className="grid grid-cols-6 gap-2 max-sm:gap-1.5">
        {cells.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            value={digit}
            onChange={(event) => handleDigitChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onFocus={(event) => event.target.select()}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`${label}: ${index + 1}`}
            className="auth-code-field aspect-[0.88] min-h-[64px] rounded-[12px] border border-border bg-surface text-center text-[28px] font-medium text-primary caret-transparent outline-none ring-0 transition-colors focus:border-accent focus:outline-none focus:ring-0 max-sm:min-h-[54px] max-sm:text-[24px]"
          />
        ))}
      </span>
    </label>
  );
}

function FormMessage({
  error,
  notice,
}: {
  error: string | null;
  notice: string | null;
}) {
  if (error) {
    return (
      <p className="mb-3 text-[14px] text-danger" role="alert">
        {error}
      </p>
    );
  }

  if (notice) {
    return (
      <p className="mb-3 text-[14px] text-accent" role="status">
        {notice}
      </p>
    );
  }

  return null;
}
