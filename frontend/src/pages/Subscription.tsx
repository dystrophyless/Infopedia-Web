import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, CheckIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { MobilePageFrame } from '../ui';
import premiumAsset from '../assets/figma-profile/ai-co-editing.svg';
import timelineToday from '../assets/figma-subscription/timeline-today.svg';
import timelineDay6 from '../assets/figma-subscription/timeline-day-6.svg';
import timelineDay7 from '../assets/figma-subscription/timeline-day-7.svg';

type Plan = 'monthly' | 'annual';

function SubscriptionPlanCard({ value, selected, onSelect, indicator, price, meta }: { value: Plan; selected: boolean; onSelect: () => void; indicator?: ReactNode; price: string; meta: string }) {
  return <label className={`relative flex h-[108px] min-w-0 cursor-pointer flex-col justify-center gap-4 rounded-[4px] bg-[#F8F5FC] p-4 ${selected ? 'border border-[#A585DB]' : 'border border-transparent'}`}>
    <input className="sr-only" type="radio" name="subscription-plan" value={value} checked={selected} onChange={onSelect} />
    <span className="flex h-6 w-full items-center justify-between"><span aria-hidden="true" className={`flex size-6 items-center justify-center rounded-full border ${selected ? 'border-[#6A37C3] bg-[#6A37C3] text-white' : 'border-[#A585DB]'}`}>{selected && <HugeiconsIcon icon={CheckIcon} size={14} />}</span>{indicator}</span>
    <span className="min-w-0"><span className="block text-[18px] font-medium leading-[18px] text-[#865BCF]">{price}</span><span className="mt-1 block text-[14px] leading-[14px] text-[#A585DB]">{meta}</span></span>
  </label>;
}

export function Subscription() {
  const { t } = useTranslation(); const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan>('annual'); const [paymentMessage, setPaymentMessage] = useState(false);
  const timeline = [[timelineToday, 'subscriptionTimelineToday', 'subscriptionTimelineTodayBody'], [timelineDay6, 'subscriptionTimelineDay6', 'subscriptionTimelineDay6Body'], [timelineDay7, 'subscriptionTimelineDay7', 'subscriptionTimelineDay7Body']] as const;
  const benefits = ['subscriptionBenefitPlan', 'subscriptionBenefitTests', 'subscriptionBenefitTopics'] as const;
  return <MobilePageFrame className="bg-[#EFEBF6] md:hidden" tone="canvas" scrollMode="content" safeAreaBottom={false} contentClassName="!pt-[26px]"
    appBar={{ title: <span className="text-[16px] font-medium leading-[16px] text-[#252329]">{t('profile.subscriptionTitle')}</span>, titleAlign: 'start', compactLayout: 'leading-only', leading: <button type="button" aria-label={t('profile.subscriptionBack')} onClick={() => navigate('/profile')} className="flex min-h-11 min-w-11 items-center justify-center text-[#252329] hover:text-[#252329] focus-visible:outline focus-visible:outline-2"><HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} /></button> }}
    footerClassName="bg-[#EFEBF6] px-6 pb-4 pt-3" footer={<div className="mx-auto w-full max-w-[430px]"><button type="button" onClick={() => setPaymentMessage(true)} className="flex h-12 w-full items-center justify-center rounded-[4px] bg-[#6A37C3] text-[16px] font-medium leading-[16px] text-white hover:bg-[#6A37C3]">{t('profile.subscriptionCta')}</button><p className="mt-4 text-center text-[12px] leading-[12px] text-[#8C8698]"><span className="block">{plan === 'annual' ? t('profile.subscriptionAnnualDisclosure') : t('profile.subscriptionMonthlyDisclosure')}</span><span className="mt-1 block">{t('profile.subscriptionCancel')}</span></p><p className="sr-only" role="status" aria-live="polite">{paymentMessage ? t('profile.mobileSubscriptionUnavailable') : ''}</p></div>}>
    <section data-figma-node="425:3479" className="mx-6 flex flex-col gap-4 rounded-[8px] bg-white p-6">
      <header className="flex items-center gap-6 pb-2"><img src={premiumAsset} alt="" className="size-8 shrink-0" /><div className="min-w-0"><p className="text-[14px] font-medium leading-[14px] text-[#6A37C3]">{t('profile.subscriptionPurchase')}</p><h1 className="mt-1 text-[18px] leading-[18px] text-black">{t('profile.subscriptionPremiumTitle')}</h1><p className="mt-1 text-[12px] leading-[12px] text-[#8C8698]">{t('profile.subscriptionBody')}</p></div></header>
      <div className="h-px w-full bg-[#EFEAF8]" />
      <fieldset className="grid min-w-0 grid-cols-2 gap-4 border-0 p-0"><legend className="sr-only">{t('profile.subscriptionPlanLabel')}</legend><SubscriptionPlanCard value="monthly" selected={plan === 'monthly'} onSelect={() => setPlan('monthly')} price="2490₸" meta={t('profile.subscriptionMonthlyMeta')} /><SubscriptionPlanCard value="annual" selected={plan === 'annual'} onSelect={() => setPlan('annual')} price="9900₸" meta={t('profile.subscriptionAnnualMeta')} indicator={<span className="rounded-[4px] bg-[#DED2F1] px-2 py-1 text-[14px] font-medium leading-[14px] text-[#865BCF]">-67%</span>} /></fieldset>
      <div className="h-px w-full bg-[#EFEAF8]" />
      <div className="relative"><div className="absolute left-[11px] top-[26px] h-[67px] w-0.5 bg-[#C5B1E7]" /> <div className="relative flex flex-col gap-4">{timeline.map(([icon, title, body]) => <div key={title} className="flex min-w-0 items-center gap-2"><img src={icon} alt="" className="size-6 shrink-0" /><div className="min-w-0 text-[12px] leading-[12px]"><p className="font-medium text-[#6A37C3]">{t(`profile.${title}`)}</p><p className="mt-1 text-[#6E6779]">{t(`profile.${body}`)}</p></div></div>)}</div></div>
      <div className="h-px w-full bg-[#EFEAF8]" />
      <section><p className="text-[12px] font-medium leading-[12px] text-[#6A37C3]">{t('profile.subscriptionBenefitsEyebrow')}</p><h2 className="mt-1 text-[16px] leading-[16px] text-black">{t('profile.subscriptionPremiumTitle')}</h2><ul className="mt-4 flex flex-col gap-2 px-2">{benefits.map(key => <li key={key} className="flex gap-2 text-[12px] leading-[12px] text-[#6E6779]"><HugeiconsIcon icon={Tick02Icon} size={14.4} strokeWidth={1.8} className="shrink-0 text-[#6A37C3]" /><span>{t(`profile.${key}`)}</span></li>)}</ul></section>
    </section>
  </MobilePageFrame>;
}
