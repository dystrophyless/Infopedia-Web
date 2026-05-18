import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { login } from '../api/auth';
import { getMe } from '../api/users';
import { AuthShell, AuthInput, AuthSubmit } from '../components/AuthShell';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/';
  const { setAuth, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={next} replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      const tokens = await login(email, password);
      setAuth(tokens.access_token);
      try {
        const me = await getMe();
        setAuth(tokens.access_token, me);
      } catch {
        /* user fetch failure does not block login */
      }
      navigate(next, { replace: true });
    } catch (err) {
      let message = t('auth.invalidCredentials');
      if (axios.isAxiosError(err) && err.response?.data) {
        const detail = (err.response.data as { detail?: string }).detail;
        if (typeof detail === 'string') message = detail;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
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
        <AuthInput
          label={t('auth.email')}
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <AuthInput
          label={t('auth.password')}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        {error && (
          <p className="text-danger text-[14px] mb-3" role="alert">
            {error}
          </p>
        )}
        <AuthSubmit loading={loading}>
          {loading ? t('common.loading') : t('auth.loginButton')}
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
