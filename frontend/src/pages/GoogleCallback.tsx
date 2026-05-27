import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { AuthShell } from '../components/AuthShell';
import {
  completeGoogleAuth,
  consumeGoogleAuthErrorFromHash,
  consumeGoogleAuthNext,
  consumeGoogleAuthTokensFromHash,
} from '../api/auth';
import { getMe } from '../api/users';
import { useAuthStore } from '../stores/authStore';
import type { AuthTokens } from '../types';

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

export function GoogleCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setAuth } = useAuthStore();
  const [hasError, setHasError] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const next = consumeGoogleAuthNext();

    async function finishWithTokens(tokens: AuthTokens) {
      setAuth(tokens.access_token, tokens.refresh_token);

      try {
        const me = await getMe();
        setAuth(tokens.access_token, tokens.refresh_token, me);
      } catch (profileErr) {
        if (isOnboardingRequiredError(profileErr)) {
          navigate('/onboarding', { replace: true });
          return;
        }
      }

      navigate(next, { replace: true });
    }

    async function finishGoogleAuth() {
      try {
        const hashError = consumeGoogleAuthErrorFromHash();
        if (hashError) {
          setHasError(true);
          return;
        }

        const hashTokens = consumeGoogleAuthTokensFromHash();
        if (hashTokens) {
          await finishWithTokens(hashTokens);
          return;
        }

        if (!code || !state) {
          setHasError(true);
          return;
        }

        const tokens = await completeGoogleAuth(code, state);
        await finishWithTokens(tokens);
      } catch {
        setHasError(true);
      }
    }

    void finishGoogleAuth();
  }, [navigate, params, setAuth]);

  return (
    <AuthShell title={t('auth.googleCallbackTitle')}>
      <div role={hasError ? 'alert' : 'status'}>
        <p className={`text-[15px] leading-snug ${hasError ? 'text-danger' : 'text-text-body'}`}>
          {hasError ? t('auth.googleAuthFailed') : t('auth.googleCallbackHelper')}
        </p>
      </div>
    </AuthShell>
  );
}
