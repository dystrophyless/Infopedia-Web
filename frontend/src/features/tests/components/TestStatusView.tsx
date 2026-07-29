import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Button, MobilePinnedAppBar, StatusPanel } from '../../../ui';

export interface TestStatusViewProps {
  title: string;
  message: string;
  actionLabel?: string;
  loading?: boolean;
  onBack: () => void;
  onAction?: () => void;
}

export function TestStatusView({
  title,
  message,
  actionLabel,
  loading = false,
  onBack,
  onAction,
}: TestStatusViewProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100dvh-80px)] bg-[#efebf6] px-6 md:py-12 md:flex md:justify-center max-md:min-h-[var(--mobile-page-available-height,100dvh)] max-md:px-6 max-md:pb-12 max-md:pt-0">
      <main className="mx-auto flex w-full max-w-[382px] flex-col md:max-w-[720px] md:min-h-[720px] max-md:min-h-[calc(100dvh-200px)]" aria-busy={loading}>
        <MobilePinnedAppBar
          title={title}
          titleAlign="start"
          compactLayout="leading-only"
          leading={(
            <button type="button" className="flex size-11 items-center justify-center text-[#252329]" aria-label={t('tests.backToTests', { defaultValue: 'Назад к тестам' })} onClick={onBack}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
            </button>
          )}
        />

        <StatusPanel
          title={message}
          tone="brand"
          announce={loading ? 'polite' : 'assertive'}
          className="mt-8 rounded-[8px] border-0 bg-[#6a37c3] p-6 text-[#f8f5fc]"
        />

        {actionLabel && onAction && (
          <div className="mt-auto pt-8">
            <Button fullWidth size="lg" className="h-12 rounded-[8px] bg-[#6a37c3] px-6 text-[16px] leading-4 text-[#f8f5fc] hover:bg-[#572d9f]" onClick={onAction}>
              {actionLabel}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
