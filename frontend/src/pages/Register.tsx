import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useLangStore } from '../stores/langStore';
import { register, login } from '../api/auth';
import { getMe } from '../api/users';
import { AuthShell, AuthInput, AuthSubmit } from '../components/AuthShell';

export function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const lang = useLangStore((s) => s.lang);
  const { setAuth, isAuthenticated } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username || !email || !password || !confirm) {
      setError(t('auth.fillAllFields'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }
    setLoading(true);
    try {
      await register({ username, email, password, language: lang });
      const tokens = await login(email, password);
      setAuth(tokens.access_token);
      try {
        const me = await getMe();
        setAuth(tokens.access_token, me);
      } catch {
        /* ignore */
      }
      navigate('/', { replace: true });
    } catch (err) {
      let message = t('auth.registrationFailed');
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
      title={t('auth.registerTitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-accent hover:underline">
            {t('auth.signIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          label={t('auth.username')}
          value={username}
          onChange={setUsername}
          autoComplete="username"
        />
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
          autoComplete="new-password"
        />
        <AuthInput
          label={t('auth.confirmPassword')}
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        {error && (
          <p className="text-danger text-[14px] mb-3" role="alert">
            {error}
          </p>
        )}
        <AuthSubmit loading={loading}>
          {loading ? t('common.loading') : t('auth.registerButton')}
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
