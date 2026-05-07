import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Book02Icon, Note01Icon, Tag01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';

interface StatItemProps {
  icon: IconSvgElement;
  number: string;
  label: string;
}

function StatItem({ icon, number, label }: StatItemProps) {
  return (
    <div className="flex items-center gap-4">
      <HugeiconsIcon icon={icon} size={56} color="var(--color-accent)" strokeWidth={1.5} />
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
        <StatItem icon={Book02Icon} number="17" label={t('landing.books')} />
        <StatItem icon={Note01Icon} number="500+" label={t('landing.topics')} />
        <StatItem icon={Tag01Icon} number="5000+" label={t('landing.terms')} />
      </div>
    </section>
  );
}
