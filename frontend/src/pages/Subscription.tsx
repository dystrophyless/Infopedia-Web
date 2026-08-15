import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  CheckIcon,
  CheckmarkSquare02Icon,
  PieChart02Icon,
  SearchingIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { IconButton, MobilePageFrame } from '../ui';
import { useMobileBottomNavOverride } from '../features/navigation';
import premiumAsset from '../assets/figma-profile/ai-co-editing.svg';
import timelineToday from '../assets/figma-subscription/timeline-today.svg';
import timelineDay6 from '../assets/figma-subscription/timeline-day-6.svg';
import timelineDay7 from '../assets/figma-subscription/timeline-day-7.svg';

type Plan = 'monthly' | 'annual';

function SubscriptionDesktopPlanOption({
  value,
  selected,
  onSelect,
  title,
  price,
  suffix,
  equivalent,
  discount,
}: {
  value: Plan;
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  suffix: string;
  equivalent?: string;
  discount?: string;
}) {
  return (
    <label
      data-subscription-desktop-plan={value}
      className={`flex min-w-0 cursor-pointer items-center justify-between gap-6 rounded-[16px] px-6 ${
        selected
          ? 'h-[72px] bg-[#F8F5FC] py-4'
          : 'h-[72px] border-[1.5px] border-[#F8F5FC] py-4'
      }`}
    >
      <input
        className="sr-only"
        type="radio"
        name="subscription-desktop-plan"
        value={value}
        checked={selected}
        onChange={onSelect}
      />
      <span className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
            selected
              ? 'border-[#6A37C3] bg-[#6A37C3] text-white'
              : 'border-[#D3C7E8]'
          }`}
        >
          {selected && <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[18px] font-medium leading-[18px] text-black">
            <span className="truncate">{title}</span>
            {discount && <span className="shrink-0 rounded-[8px] bg-[#DED2F1] px-2 py-0.5 text-[14px] leading-[14px] text-[#6A37C3]">{discount}</span>}
          </span>
          {equivalent && <span data-subscription-contrast-lock="annual-equivalent" className="mt-2 block truncate text-[14px] leading-[14px] text-[#B1ACB9]">{equivalent}</span>}
        </span>
      </span>
      <span className="flex shrink-0 items-center text-right">
        <span className="whitespace-nowrap text-[24px] font-medium leading-[24px] text-black">
          {price} <span className="text-[16px] font-normal leading-[16px] text-[#6E6779]">{suffix}</span>
        </span>
      </span>
    </label>
  );
}

function SubscriptionDesktopFeature({
  icon,
  title,
  description,
}: {
  icon: typeof SearchingIcon;
  title: string;
  description: string;
}) {
  return (
    <div data-subscription-desktop-feature className="flex min-w-0 items-center gap-6">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[8px] bg-[#F8F5FC] text-[#6A37C3]">
        <HugeiconsIcon icon={icon} size={24} strokeWidth={1.5} />
      </span>
      <span className="min-w-0">
        <span className="block text-[18px] leading-[18px] text-black">{title}</span>
        <span className="mt-2 block text-[16px] leading-[16px] text-[#6E6779]">{description}</span>
      </span>
    </div>
  );
}

function SubscriptionPlanCard({ value, selected, onSelect, indicator, price, meta }: { value: Plan; selected: boolean; onSelect: () => void; indicator?: ReactNode; price: string; meta: string }) {
  return <label className={`relative flex h-[108px] min-w-0 cursor-pointer flex-col justify-center gap-4 rounded-[4px] bg-[#F8F5FC] p-4 ${selected ? 'border border-[#A585DB]' : 'border border-transparent'}`}>
    <input className="sr-only" type="radio" name="subscription-plan" value={value} checked={selected} onChange={onSelect} />
    <span className="flex h-6 w-full items-center justify-between"><span aria-hidden="true" className={`flex size-6 items-center justify-center rounded-full border ${selected ? 'border-[#6A37C3] bg-[#6A37C3] text-white' : 'border-[#A585DB]'}`}>{selected && <HugeiconsIcon icon={CheckIcon} size={14} />}</span>{indicator}</span>
    <span className="min-w-0"><span className="block text-[18px] font-medium leading-[18px] text-[#865BCF]">{price}</span><span className="mt-1 block text-[14px] leading-[14px] text-[#A585DB]">{meta}</span></span>
  </label>;
}

export function Subscription() {
  const { t } = useTranslation(); const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan>('annual'); const [planTouched, setPlanTouched] = useState(false);
  const mobileNavHidden = planTouched;
  useMobileBottomNavOverride({ visibility: mobileNavHidden ? 'hide' : 'show' });
  const handleDesktopBack = () => {
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate('/profile', { replace: true });
  };
  const timeline = [[timelineToday, 'subscriptionTimelineToday', 'subscriptionTimelineTodayBody'], [timelineDay6, 'subscriptionTimelineDay6', 'subscriptionTimelineDay6Body'], [timelineDay7, 'subscriptionTimelineDay7', 'subscriptionTimelineDay7Body']] as const;
  const benefits = ['subscriptionBenefitPlan', 'subscriptionBenefitTests', 'subscriptionBenefitTopics'] as const;
  return <>
  <MobilePageFrame className="bg-[#EFEBF6] md:hidden" tone="canvas" scrollMode="content" safeAreaBottom={false} contentClassName="!pt-[26px]"
    appBar={{ title: <span className="text-[16px] font-medium leading-[16px] text-[#252329]">{t('profile.subscriptionTitle')}</span>, titleAlign: 'start', compactLayout: 'leading-only', leading: <button type="button" aria-label={t('profile.subscriptionBack')} onClick={() => navigate('/profile')} className="flex min-h-11 min-w-11 items-center justify-center text-[#252329] hover:text-[#252329] focus-visible:outline focus-visible:outline-2"><HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} /></button> }}>
    <section data-figma-node="425:3479" className="mx-6 flex flex-col gap-4 rounded-[8px] bg-white p-6">
      <header className="flex items-center gap-6 pb-2"><img src={premiumAsset} alt="" className="size-8 shrink-0" /><div className="min-w-0"><p className="text-[14px] font-medium leading-[14px] text-[#6A37C3]">{t('profile.subscriptionPurchase')}</p><h1 className="mt-1 text-[18px] leading-[18px] text-black">{t('profile.subscriptionPremiumTitle')}</h1><p className="mt-1 text-[12px] leading-[12px] text-[#8C8698]">{t('profile.subscriptionBody')}</p></div></header>
      <div className="h-px w-full bg-[#EFEAF8]" />
      <fieldset className="grid min-w-0 grid-cols-2 gap-4 border-0 p-0"><legend className="sr-only">{t('profile.subscriptionPlanLabel')}</legend><SubscriptionPlanCard value="monthly" selected={plan === 'monthly'} onSelect={() => { setPlanTouched(true); setPlan('monthly'); }} price="2490₸" meta={t('profile.subscriptionMonthlyMeta')} /><SubscriptionPlanCard value="annual" selected={plan === 'annual'} onSelect={() => { setPlanTouched(true); setPlan('annual'); }} price="9900₸" meta={t('profile.subscriptionAnnualMeta')} indicator={<span className="rounded-[4px] bg-[#DED2F1] px-2 py-1 text-[14px] font-medium leading-[14px] text-[#865BCF]">-67%</span>} /></fieldset>
      <div className="h-px w-full bg-[#EFEAF8]" />
      <div className="relative"><div className="absolute left-[11px] top-[26px] h-[67px] w-0.5 bg-[#C5B1E7]" /> <div className="relative flex flex-col gap-4">{timeline.map(([icon, title, body]) => <div key={title} className="flex min-w-0 items-center gap-2"><img src={icon} alt="" className="size-6 shrink-0" /><div className="min-w-0 text-[12px] leading-[12px]"><p className="font-medium text-[#6A37C3]">{t(`profile.${title}`)}</p><p className="mt-1 text-[#6E6779]">{t(`profile.${body}`)}</p></div></div>)}</div></div>
      <div className="h-px w-full bg-[#EFEAF8]" />
      <section><p className="text-[12px] font-medium leading-[12px] text-[#6A37C3]">{t('profile.subscriptionBenefitsEyebrow')}</p><h2 className="mt-1 text-[16px] leading-[16px] text-black">{t('profile.subscriptionPremiumTitle')}</h2><ul className="mt-4 flex flex-col gap-2 px-2">{benefits.map(key => <li key={key} className="flex items-center gap-2 text-left text-[12px] leading-[12px] text-[#6E6779]"><HugeiconsIcon icon={Tick02Icon} size={14.4} strokeWidth={1.8} className="shrink-0 text-[#6A37C3]" /><span>{t(`profile.${key}`)}</span></li>)}</ul></section>
    </section>
    <div data-subscription-actions className="mx-auto mt-6 w-full max-w-[430px] px-6 pb-4"><button data-subscription-cta type="button" disabled className="flex h-12 w-full items-center justify-center rounded-[4px] bg-[#6A37C3] text-[16px] font-medium leading-[16px] text-white opacity-60">{t('profile.mobileSubscriptionUnavailable')}</button><p data-subscription-disclosure className="mt-4 text-center text-[12px] leading-[12px] text-[#8C8698]"><span className="block">{plan === 'annual' ? t('profile.subscriptionAnnualDisclosure') : t('profile.subscriptionMonthlyDisclosure')}</span><span className="mt-1 block">{t('profile.subscriptionCancel')}</span></p><p className="sr-only" role="status" aria-live="polite">{t('profile.mobileSubscriptionUnavailable')}</p></div>
  </MobilePageFrame>
  <div data-subscription-desktop className="hidden relative min-h-screen w-full min-w-0 max-w-full justify-center overflow-x-hidden bg-[#EFEAF8] md:flex md:items-start md:px-8 md:pb-8 md:pt-24 lg:items-center lg:py-16 xl:px-16 min-[1440px]:px-32">
    <IconButton data-subscription-desktop-back aria-label={t('common.previous')} onClick={handleDesktopBack} size="lg" className="absolute left-8 top-8 z-10 cursor-pointer !text-[#6A37C3] transition-[background-color,color,box-shadow] duration-[140ms] hover:!bg-[#f8f5fc] hover:!text-[#6A37C3] focus-visible:!bg-[#f8f5fc] focus-visible:!text-[#6A37C3] focus-visible:!ring-[#6A37C3] focus-visible:!ring-offset-[#efeaf8] motion-reduce:transition-none">
      <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
    </IconButton>
    <div data-subscription-desktop-row className="grid w-full max-w-[1184px] min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
      <section data-subscription-desktop-left className="flex min-h-[551px] min-w-0 flex-col items-start justify-between rounded-[16px] bg-white p-8 xl:p-12 min-[1440px]:p-16">
        <div>
          <h1 className="text-[28px] font-medium leading-[28px] text-black">{t('profile.subscriptionDesktopHeading')}</h1>
          <p className="mt-4 whitespace-pre-line text-[18px] leading-[18px] text-[#6E6779]">{t('profile.subscriptionDesktopSubtitle')}</p>
        </div>
        <div className="flex flex-col gap-12">
          <SubscriptionDesktopFeature icon={SearchingIcon} title={t('profile.subscriptionDesktopFeatureSearchTitle')} description={t('profile.subscriptionDesktopFeatureSearchDescription')} />
          <SubscriptionDesktopFeature icon={CheckmarkSquare02Icon} title={t('profile.subscriptionDesktopFeatureTestsTitle')} description={t('profile.subscriptionDesktopFeatureTestsDescription')} />
          <SubscriptionDesktopFeature icon={PieChart02Icon} title={t('profile.subscriptionDesktopFeatureAnalyzeTitle')} description={t('profile.subscriptionDesktopFeatureAnalyzeDescription')} />
        </div>
      </section>
      <section data-subscription-desktop-right className="flex min-h-[551px] min-w-0 flex-col rounded-[16px] bg-white p-8 xl:p-12 min-[1440px]:p-16">
        <div data-subscription-desktop-plan-area className="flex h-[325px] min-h-[325px] flex-col justify-between">
          <div>
            <h2 className="text-[28px] font-medium leading-[28px] text-black">{t('profile.subscriptionDesktopPlanHeading')}</h2>
            <p className="mt-4 text-[18px] leading-[18px] text-[#6E6779]">{t('profile.subscriptionDesktopPlanSubtitle')}</p>
          </div>
          <fieldset className="flex min-w-0 flex-col gap-4 border-0 p-0">
            <legend className="sr-only">{t('profile.subscriptionPlanLabel')}</legend>
            <SubscriptionDesktopPlanOption value="monthly" selected={plan === 'monthly'} onSelect={() => { setPlanTouched(true); setPlan('monthly'); }} title={t('profile.subscriptionDesktopMonthly')} price="2490" suffix={t('profile.subscriptionDesktopMonthSuffix')} />
            <SubscriptionDesktopPlanOption value="annual" selected={plan === 'annual'} onSelect={() => { setPlanTouched(true); setPlan('annual'); }} title={t('profile.subscriptionDesktopAnnual')} price="9900" suffix={t('profile.subscriptionDesktopYearSuffix')} equivalent={t('profile.subscriptionDesktopAnnualEquivalent')} discount={t('profile.subscriptionDesktopDiscount')} />
          </fieldset>
        </div>
        <button data-subscription-desktop-cta type="button" disabled className="mt-12 flex h-[50px] w-full shrink-0 items-center justify-center rounded-[8px] bg-[#6A37C3] px-6 py-4 text-[18px] font-medium leading-[18px] text-white hover:bg-action-primary-hover disabled:hover:bg-action-primary-hover disabled:cursor-not-allowed">{plan === 'annual' ? t('profile.subscriptionDesktopCtaAnnual') : t('profile.subscriptionDesktopCtaMonthly')}</button>
      </section>
    </div>
  </div>
  </>;
}
