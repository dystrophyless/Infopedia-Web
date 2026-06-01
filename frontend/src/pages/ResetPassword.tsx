import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { resetPassword } from '../api/auth';
import { AuthPasswordInput, AuthShell, AuthSubmit } from '../components/AuthShell';
import { getPasswordValidationError } from '../utils/passwordValidation';

type ResetPasswordFieldErrors = {
  password?: string;
  confirmPassword?: string;
};

export function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(token ? null : t('auth.resetPasswordMissingToken'));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setError(token ? null : t('auth.resetPasswordMissingToken'));
    setFieldErrors({});

    if (!token) return;

    const nextErrors: ResetPasswordFieldErrors = {};
    nextErrors.password = getPasswordValidationError(password, t);
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = t('auth.passwordsDontMatch');
    }

    if (nextErrors.password || nextErrors.confirmPassword) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setNotice(t('auth.resetPasswordSuccess'));
      setPassword('');
      setConfirmPassword('');
      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (err) {
      setError(getAuthErrorMessage(err, t('auth.resetPasswordFailed')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t('auth.resetPasswordTitle')}
      footer={
        <Link to="/login" className="text-accent hover:underline">
          {t('auth.backToLogin')}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <p className="mb-5 max-w-full break-words text-[15px] leading-snug text-text-body">
          {t('auth.resetPasswordHelper')}
        </p>
        <AuthPasswordInput
          label={t('auth.newPassword')}
          value={password}
          visible={showPassword}
          onChange={(value) => {
            setPassword(value);
            setFieldErrors((errors) => ({ ...errors, password: undefined }));
            setError(token ? null : t('auth.resetPasswordMissingToken'));
            setNotice(null);
          }}
          onToggle={() => setShowPassword((visible) => !visible)}
          toggleLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          autoComplete="new-password"
          error={fieldErrors.password}
        />
        <AuthPasswordInput
          label={t('auth.confirmPassword')}
          value={confirmPassword}
          visible={showConfirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
            setFieldErrors((errors) => ({ ...errors, confirmPassword: undefined }));
            setError(token ? null : t('auth.resetPasswordMissingToken'));
            setNotice(null);
          }}
          onToggle={() => setShowConfirmPassword((visible) => !visible)}
          toggleLabel={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />
        {notice && (
          <p className="mb-3 rounded-[8px] bg-success/10 px-3 py-2 text-[14px] text-success" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="mb-3 text-[14px] text-danger" role="alert">
            {error}
          </p>
        )}
        <AuthSubmit loading={loading} disabled={!token}>
          {loading ? t('common.loading') : t('auth.resetPasswordButton')}
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
