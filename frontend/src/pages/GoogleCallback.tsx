import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  completeGoogleAuth,
  consumeGoogleAuthErrorFromHash,
  consumeGoogleAuthNext,
  consumeGoogleAuthTokensFromHash,
} from '../api/auth';
import { getMe } from '../api/users';
import { useAuthStore } from '../stores/authStore';
import type { AuthTokens } from '../types';
import { Skeleton } from '../ui';

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
  const [next] = useState(() => consumeGoogleAuthNext());
  const [hasError, setHasError] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const code = params.get('code');
    const state = params.get('state');
    async function finishWithTokens(tokens: AuthTokens) {
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
  }, [navigate, next, params, setAuth]);

  return (
    hasError ? (
      <div role="alert" className="min-h-screen bg-canvas p-6 text-danger">{t('auth.googleAuthFailed')}</div>
    ) : (
      <GoogleCallbackLoadingState label={t('auth.googleCallbackHelper')} next={next} />
    )
  );
}

function GoogleCallbackOnboardingSkeleton() {
  return (
    <div data-google-callback-onboarding-skeleton aria-hidden="true" className="min-h-screen bg-[#efebf6] px-6 py-6 md:px-12 md:py-8">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-8">
        <div data-google-callback-logo className="h-8 w-32 rounded-[8px] bg-white md:h-11 md:w-[171px]" />
        <div data-google-callback-progress className="flex items-center gap-3 md:gap-6"><span className="size-8 rounded-full bg-action-primary/35 md:size-12" /><span className="h-1 flex-1 bg-action-primary/20" /><span className="size-8 rounded-full bg-surface-muted md:size-12" /><span className="h-1 flex-1 bg-surface-muted" /><span className="size-8 rounded-full bg-surface-muted md:size-12" /></div>
        <section data-google-callback-onboarding-card className="mx-auto flex w-full max-w-[480px] flex-col gap-6 rounded-[16px] bg-white p-6 md:p-12"><Skeleton className="h-7 w-4/5" /><Skeleton className="h-4 w-3/5" /><div data-google-callback-grade-rows className="flex flex-col gap-3"><Skeleton className="h-12 w-full rounded-[8px]" /><Skeleton className="h-12 w-full rounded-[8px]" /><Skeleton className="h-12 w-full rounded-[8px]" /></div><Skeleton className="h-12 w-full rounded-[8px]" /></section>
      </div>
    </div>
  );
}

function GoogleCallbackAppSkeleton() {
  return (
    <div data-google-callback-app-skeleton aria-hidden="true" className="flex min-h-screen bg-canvas">
      <aside data-google-callback-sidebar className="hidden w-[240px] flex-col gap-6 border-r border-border bg-white p-6 md:flex"><Skeleton className="h-8 w-32" /><div className="flex flex-col gap-3"><Skeleton className="h-10 w-full rounded-[8px]" /><Skeleton className="h-10 w-full rounded-[8px]" /><Skeleton className="h-10 w-full rounded-[8px]" /></div></aside>
      <main data-google-callback-app-content className="min-w-0 flex-1 p-6 pb-24 md:p-12">
        <Skeleton className="h-8 w-2/5 bg-white" />
        <div className="mt-8 flex max-w-[684px] flex-col gap-4">
          <div data-google-callback-app-surface className="rounded-[16px] bg-white p-6"><Skeleton className="h-8 w-3/5" /><Skeleton className="mt-3 h-4 w-4/5" /></div>
          <div data-google-callback-app-surface className="flex min-h-[128px] flex-col gap-3 rounded-[16px] bg-white p-6"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
        </div>
      </main>
      <nav data-google-callback-mobile-nav className="fixed inset-x-0 bottom-0 flex h-16 items-center justify-around border-t border-border bg-white p-3 md:hidden"><Skeleton className="size-8 rounded-full" /><Skeleton className="size-8 rounded-full" /><Skeleton className="size-8 rounded-full" /><Skeleton className="size-8 rounded-full" /></nav>
    </div>
  );
}

export function GoogleCallbackLoadingState({ label, next = '/' }: { label: string; next?: string }) {
  return (
    <div
      data-google-callback-loading
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col gap-4"
    >
      <span className="sr-only">{label}</span>
      {next === '/onboarding' ? <GoogleCallbackOnboardingSkeleton /> : <GoogleCallbackAppSkeleton />}
    </div>
  );
}
