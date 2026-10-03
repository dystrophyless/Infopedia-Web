import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  CheckmarkSquare02Icon,
  Invoice01Icon,
  Robot01Icon,
  TradeUpIcon,
} from '@hugeicons/core-free-icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// Figma display samples only. Replace these when an account usage contract exists.
const usageSamples = [
  { id: 'tests', used: 3, limit: 5, period: 'month', icon: CheckmarkSquare02Icon, labelKey: 'desktopBillingTests' },
  { id: 'analyze', used: 1, limit: 3, period: 'month', icon: TradeUpIcon, labelKey: 'desktopBillingAnalyze' },
  { id: 'algosha', used: 10, limit: 20, period: 'day', icon: Robot01Icon, labelKey: 'desktopBillingAlgosha' },
] as const;

export function DesktopBillingPage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section data-figma-node="1723:3376" className="min-h-screen bg-[#efeaf8] px-6 py-16 max-md:hidden">
      <div data-billing-content className="mx-auto w-full max-w-[640px]">
        <div className="flex flex-col gap-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-fit items-center gap-2 text-left text-[16px] font-medium leading-[16px] text-[#6e6779] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>{t('profile.desktopBillingBack')}</span>
          </button>

          <h1 className="pl-2 text-[20px] font-medium leading-[20px] text-[#161519]">
            {t('profile.desktopBillingTitle')}
          </h1>

          <section data-billing-current-plan aria-label={t('profile.desktopBillingCurrentPlan')} className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-[#f0ebf9] bg-white p-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-medium leading-[16px] text-[#161519]">{t('profile.desktopBillingFree')}</h2>
              <p className="mt-2 text-[14px] leading-[14px] text-[#6e6779]">{t('profile.desktopBillingPlanDescription')}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/subscription')}
              className="flex h-[38px] shrink-0 items-center justify-center rounded-[8px] bg-[#6a37c3] px-7 text-[14px] font-medium leading-[14px] text-white transition-colors hover:bg-[#4c268c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3] motion-reduce:transition-none"
            >
              {t('profile.desktopBillingUpgrade')}
            </button>
          </section>

          <section aria-labelledby="desktop-billing-usage-title" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pl-2">
              <h2 id="desktop-billing-usage-title" className="text-[16px] font-medium leading-[16px] text-[#6e6779]">
                {t('profile.desktopBillingUsageTitle')}
              </h2>
              <span data-billing-sample-note className="text-right text-[12px] leading-[12px] text-[#a585db]">
                {t('profile.desktopBillingSampleNotice')}
              </span>
            </div>
            <div className="rounded-[16px] border border-[#f0ebf9] bg-white p-6">
              <div className="flex flex-col gap-5">
                {usageSamples.map(({ id, used, limit, period, icon, labelKey }) => (
                  <div key={id} className="flex flex-col gap-5">
                    {id !== 'tests' && <div className="h-px w-full bg-[#f8f5fc]" aria-hidden="true" />}
                    <div data-billing-usage={id} className="min-w-0">
                      <div className="flex min-w-0 items-center justify-between gap-4">
                        <span className="flex min-w-0 items-center gap-2">
                          <HugeiconsIcon icon={icon} size={16} strokeWidth={1.6} className="shrink-0 text-[#6a37c3]" aria-hidden="true" />
                          <span className="min-w-0 text-[14px] font-medium leading-[14px] text-[#161519]">{t(`profile.${labelKey}`)}</span>
                        </span>
                        <span className="shrink-0 text-[13px] leading-[13px] text-[#6e6779]">
                          {t('profile.desktopBillingUsageCount', {
                            used,
                            limit,
                            unit: t(`profile.${period === 'month' ? 'desktopBillingMonthlyUnit' : 'desktopBillingDailyUnit'}`),
                          })}
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={t(`profile.${labelKey}`)}
                        aria-valuenow={used}
                        aria-valuemin={0}
                        aria-valuemax={limit}
                        className="mt-2 h-[6px] overflow-hidden rounded-[3px] bg-[#f0ebf9]"
                      >
                        <div className="h-full rounded-[3px] bg-[#6a37c3]" style={{ width: `${used / limit * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 flex items-center gap-2 pt-1 text-[12px] leading-[12px] text-[#a585db]">
                <span aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-[#a585db]" />
                {t('profile.desktopBillingLimitsNote')}
              </p>
            </div>
          </section>

          <section data-billing-payment-history aria-labelledby="desktop-billing-history-title" className="flex flex-col gap-4">
            <h2 id="desktop-billing-history-title" className="pl-2 text-[16px] font-medium leading-[16px] text-[#6e6779]">
              {t('profile.desktopBillingHistoryTitle')}
            </h2>
            <div className="rounded-[16px] border border-[#f0ebf9] bg-white p-6">
              <div role="table" aria-label={t('profile.desktopBillingHistoryTitle')}>
                <div role="row" className="grid grid-cols-3 gap-2 border-b border-[#f0ebf9] pb-4 text-[13px] font-medium leading-[13px] text-[#a585db]">
                  <span role="columnheader">{t('profile.desktopBillingHistoryDate')}</span>
                  <span role="columnheader">{t('profile.desktopBillingHistoryAmount')}</span>
                  <span role="columnheader">{t('profile.desktopBillingHistoryStatus')}</span>
                </div>
              </div>
              <div data-billing-payment-empty className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-[#efeaf8] text-[#a585db]" aria-hidden="true">
                  <HugeiconsIcon icon={Invoice01Icon} size={24} strokeWidth={1.5} />
                </span>
                <p className="text-[16px] font-medium leading-[16px] text-[#161519]">{t('profile.desktopBillingHistoryEmptyTitle')}</p>
                <div className="text-[14px] leading-[14px] text-[#b1acb9]">
                  <p>{t('profile.desktopBillingHistoryEmptyDescriptionFirst')}</p>
                  <p>{t('profile.desktopBillingHistoryEmptyDescriptionSecond')}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
