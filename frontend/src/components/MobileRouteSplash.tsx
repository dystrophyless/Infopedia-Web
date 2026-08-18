import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const SPLASH_MS = 340;
const REDUCED_MOTION_SPLASH_MS = 120;

function getSplashDuration() {
  if (typeof window === 'undefined') return SPLASH_MS;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? REDUCED_MOTION_SPLASH_MS
    : SPLASH_MS;
}

export function MobileRouteSplash() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    if (!visible || typeof window === 'undefined') return undefined;

    const timer = window.setTimeout(() => setVisible(false), getSplashDuration());

    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-bg md:hidden"
      role="status"
      aria-live="polite"
      aria-label={t('mobile.splashLoading')}
    >
      <img
        src="/logo.svg"
        alt=""
        aria-hidden="true"
        className="h-[58px] w-auto animate-pulse motion-reduce:animate-none"
      />
      <span className="sr-only">{t('mobile.splashLoading')}</span>
    </div>
  );
}
