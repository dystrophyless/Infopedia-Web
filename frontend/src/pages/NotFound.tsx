import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { EmptyState } from '../ui';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-16">
      <EmptyState
        variant="outcome"
        icon={<HugeiconsIcon icon={AlertCircleIcon} size={32} strokeWidth={1.6} />}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={(
          <Link
            to="/"
            className="flex min-h-[48px] w-full items-center justify-center rounded-[8px] bg-action-primary px-5 text-[16px] font-medium leading-4 text-white transition-colors hover:bg-action-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-action-primary"
          >
            {t('notFound.homeCta')}
          </Link>
        )}
      />
    </main>
  );
}
