import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { forgotPassword } from '../api/auth';
import { AuthEmailInput, AuthShell, AuthSubmit } from '../components/AuthShell';

const RESET_LINK_COOLDOWN_SECONDS = 60;

export function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(undefined);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setEmailError(t('auth.emailRequired'));
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(normalizedEmail);
      setEmail(normalizedEmail);
      setResendSeconds(RESET_LINK_COOLDOWN_SECONDS);
      setSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err, t('auth.forgotPasswordFailed')));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendLink() {
    if (resendSeconds > 0 || loading) return;

    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setResendSeconds(RESET_LINK_COOLDOWN_SECONDS);
    } catch (err) {
      setError(getAuthErrorMessage(err, t('auth.forgotPasswordFailed')));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title={t('auth.resetEmailSentTitle')}
        footer={
          <button
            type="button"
            onClick={handleResendLink}
            disabled={loading || resendSeconds > 0}
            className="text-accent hover:underline disabled:text-muted disabled:no-underline"
          >
            {loading
              ? t('common.loading')
              : resendSeconds > 0
                ? t('auth.resendIn', { seconds: resendSeconds })
                : t('auth.resendResetLink')}
          </button>
        }
      >
        <div className="text-left">
          <p className="max-w-full break-words text-[15px] leading-snug text-text-body">
            {t('auth.resetEmailSentBody', { email })}
          </p>
          {error && (
            <p className="mt-4 text-[14px] leading-snug text-danger" role="alert">
              {error}
            </p>
          )}
          <Link
            to="/login"
            className="mt-8 inline-flex h-[48px] w-full items-center justify-center rounded-[10px] bg-primary px-4 text-[16px] font-medium text-surface transition-opacity hover:opacity-90"
          >
            {t('auth.backToLoginButton')}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.forgotPasswordTitle')}
      footer={
        <>
          {t('auth.rememberedPassword')}{' '}
          <Link to="/login" className="text-accent hover:underline">
            {t('auth.signIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <p className="mb-5 max-w-full break-words text-[15px] leading-snug text-text-body">
          {t('auth.forgotPasswordHelper')}
        </p>
        <AuthEmailInput
          label={t('auth.email')}
          value={email}
          onChange={(value) => {
            setEmail(value);
            setEmailError(undefined);
            setError(null);
          }}
          error={emailError}
        />
        {error && (
          <p className="mb-3 text-[14px] text-danger" role="alert">
            {error}
          </p>
        )}
        <AuthSubmit loading={loading}>
          {loading ? t('common.loading') : t('auth.sendResetLinkButton')}
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}

function getAuthErrorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err) || !err.response?.data) return fallback;

  const detail = (err.response.data as { detail?: unknown }).detail;
  return typeof detail === 'string' ? detail : fallback;
}
