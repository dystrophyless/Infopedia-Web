import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { login, startGoogleAuth } from '../api/auth';
import { getMe } from '../api/users';
import {
  AuthDivider,
  AuthEmailInput,
  AuthPasswordInput,
  AuthShell,
  AuthSubmit,
  GoogleAuthButton,
} from '../components/AuthShell';

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

function isOnboardingRequiredError(err: unknown) {
  if (!axios.isAxiosError(err)) return false;

  const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail;
  return (
    err.response?.status === 403 &&
    detail !== null &&
    typeof detail === 'object' &&
    'code' in detail &&
    detail.code === 'onboarding_required'
  );
}

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/';
  const { setAuth, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={next} replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const nextErrors: LoginFieldErrors = {};
    if (!email.trim()) {
      nextErrors.email = t('auth.emailRequired');
    }
    if (!password) {
      nextErrors.password = t('auth.passwordRequired');
    }

    if (nextErrors.email || nextErrors.password) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const tokens = await login(email, password);
      setAuth(tokens.access_token, tokens.refresh_token);
      try {
        const me = await getMe();
        setAuth(tokens.access_token, tokens.refresh_token, me);
        if (me.onboarding_completed !== true) {
          navigate('/onboarding', { replace: true });
          return;
        }
      } catch (profileErr) {
        if (isOnboardingRequiredError(profileErr)) {
          navigate('/onboarding', { replace: true });
          return;
        }
        /* user fetch failure does not block login */
      }
      navigate(next, { replace: true });
    } catch (err) {
      let message = t('auth.invalidCredentials');
      if (axios.isAxiosError(err) && err.response?.data) {
        const detail = (err.response.data as { detail?: string }).detail;
        if (typeof detail === 'string') {
          message = detail.includes('имя пользователя') ? t('auth.invalidCredentials') : detail;
        }
      }
      setError(message);
      setFieldErrors({ email: message, password: message });
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleAuth() {
    startGoogleAuth(next);
  }

  return (
    <AuthShell
      title={t('auth.loginTitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-accent hover:underline">
            {t('auth.signUp')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <p className="mb-5 max-w-full break-words text-[15px] leading-none text-text-body">
          {t('auth.loginHelper')}
        </p>
        <AuthEmailInput
          label={t('auth.email')}
          value={email}
          onChange={(value) => {
            setEmail(value);
            setFieldErrors((errors) => ({ ...errors, email: undefined }));
            setError(null);
          }}
          error={error ? undefined : fieldErrors.email}
          invalid={Boolean(error && fieldErrors.email)}
        />
        <AuthPasswordInput
          label={t('auth.password')}
          value={password}
          visible={showPassword}
          onChange={(value) => {
            setPassword(value);
            setFieldErrors((errors) => ({ ...errors, password: undefined }));
            setError(null);
          }}
          onToggle={() => setShowPassword((visible) => !visible)}
          toggleLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          autoComplete="current-password"
          error={error ? undefined : fieldErrors.password}
          invalid={Boolean(error && fieldErrors.password)}
        />
        {error && (
          <div className="-mt-1 mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-[14px]">
            <p className="min-w-0 leading-none text-danger" role="alert">
              {error}
            </p>
            <Link
              to="/forgot-password"
              className="whitespace-nowrap text-[14px] font-medium leading-none text-accent hover:underline"
            >
              {t('auth.forgotPasswordLink')}
            </Link>
          </div>
        )}
        <AuthSubmit loading={loading}>
          {loading ? t('common.loading') : t('auth.loginButton')}
        </AuthSubmit>
        <AuthDivider label={t('auth.or')} />
        <GoogleAuthButton onClick={handleGoogleAuth}>
          {t('auth.continueWithGoogle')}
        </GoogleAuthButton>
      </form>
    </AuthShell>
  );
}
