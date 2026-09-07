import { useTranslation } from 'react-i18next';
import { Skeleton } from '../ui';

/**
 * Neutral route-level fallback used while a lazy page is being fetched.
 * It deliberately avoids imitating a particular page so the eager shell can
 * stay mounted without exposing a text-only loading flash.
 */
export function RouteLoading() {
  const { t } = useTranslation();

  return (
    <div
      data-route-loading
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-[240px] bg-bg p-6 md:min-h-[calc(100dvh-80px)] md:p-10"
    >
      <span className="sr-only">{t('common.loading')}</span>
      <div aria-hidden="true" className="mx-auto flex w-full max-w-[1120px] flex-col gap-6">
        <Skeleton aria-hidden="true" className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
          <Skeleton aria-hidden="true" className="h-48 w-full rounded-[16px]" />
          <Skeleton aria-hidden="true" className="h-48 w-full rounded-[16px]" />
        </div>
      </div>
    </div>
  );
}

