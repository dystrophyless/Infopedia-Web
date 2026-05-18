import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FigmaStatBooksIcon,
  FigmaStatTermsIcon,
  FigmaStatTopicsIcon,
} from './FigmaIcons';

interface StatItemProps {
  icon: ReactNode;
  number: string;
  label: string;
}

function StatItem({ icon, number, label }: StatItemProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-[75px] items-center justify-center">{icon}</div>
      <div className="flex flex-col leading-tight">
        <span className="font-medium text-[55px] text-accent leading-[1] max-md:text-[40px]">
          {number}
        </span>
        <span className="text-[25px] text-muted max-md:text-[18px]">{label}</span>
      </div>
    </div>
  );
}

export function StatsBar() {
  const { t } = useTranslation();

  return (
    <section className="bg-surface w-full py-[80px]">
      <div className="mx-auto max-w-[1200px] flex flex-wrap items-center justify-center gap-x-[170px] gap-y-10 px-6 max-lg:gap-x-16">
        <StatItem icon={<FigmaStatBooksIcon className="block h-[74px] w-[54px]" />} number="17" label={t('landing.books')} />
        <StatItem icon={<FigmaStatTopicsIcon className="block h-[75px] w-[58px]" />} number="500+" label={t('landing.topics')} />
        <StatItem icon={<FigmaStatTermsIcon className="block h-[75px] w-[50px]" />} number="5000+" label={t('landing.terms')} />
      </div>
    </section>
  );
}
