import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpen01Icon } from '@hugeicons/core-free-icons';
import { useAuthStore } from '../stores/authStore';
import { Hero } from '../components/Hero';
import { StatsBar } from '../components/StatsBar';
import { FeatureCard } from '../components/FeatureCard';
import { TermCardCarousel } from '../components/TermCardCarousel';
import {
  FigmaFeatureAnalyticsIcon,
  FigmaFeatureDescriptionIcon,
  FigmaFeatureSearchIcon,
} from '../components/FigmaIcons';

function authTarget(path: string, isAuthenticated: boolean): string {
  if (isAuthenticated) return path;
  return `/login?next=${encodeURIComponent(path)}`;
}

export function Landing() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="w-full">
      <Hero />

      <section
        id="featured-terms"
        className="scroll-mt-[112px] bg-bg pb-[96px]"
      >
        <p className="mb-6 text-center text-[14px] tracking-wider text-border">
          {t('landing.termExamples')}
        </p>
        <TermCardCarousel />
      </section>

      <StatsBar />

      <section
        id="tools"
        className="scroll-mt-[112px] bg-bg px-6 py-[110px]"
      >
        <h2 className="mb-12 text-center text-[40px] font-medium leading-[1] text-text max-md:text-[28px]">
          {t('landing.allTools')}
        </h2>
        <div className="mx-auto flex max-w-[1334px] flex-wrap justify-center gap-8">
          <FeatureCard
            icon={<FigmaFeatureSearchIcon className="block size-[21px]" />}
            title={t('landing.feature1Title')}
            description={t('landing.feature1Desc')}
            to={authTarget('/search', isAuthenticated)}
          />
          <FeatureCard
            icon={<FigmaFeatureDescriptionIcon className="block h-[18px] w-[21px]" />}
            title={t('landing.feature2Title')}
            description={t('landing.feature2Desc')}
            to={authTarget('/semantic-search', isAuthenticated)}
          />
          <FeatureCard
            icon={<FigmaFeatureAnalyticsIcon className="block h-[21px] w-[24px]" />}
            title={t('landing.feature3Title')}
            description={t('landing.feature3Desc')}
            to={authTarget('/semantic-search', isAuthenticated)}
          />
        </div>
      </section>

      <section
        id="books"
        className="h-[425px] scroll-mt-[112px] bg-surface px-6 pt-[65px]"
      >
        <div className="mx-auto flex max-w-[820px] flex-col items-center text-center">
          <div className="mb-[27px] flex size-[59px] items-center justify-center rounded-[10px] bg-secondary">
            <HugeiconsIcon icon={BookOpen01Icon} size={31} strokeWidth={1.7} className="text-surface" />
          </div>
          <h2 className="mb-[26px] text-[40px] font-medium leading-[1] text-text max-md:text-[28px]">
            {t('landing.booksSectionTitle')}
          </h2>
          <p className="mb-[32px] max-w-[533px] text-[16px] leading-[1] text-muted">
            {t('landing.booksSectionSubtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-[10px]">
            {[
              t('landing.booksChipBook'),
              t('landing.booksChipPage'),
              t('landing.booksChipTopic'),
              t('landing.booksChipDefinition'),
            ].map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-bg px-5 py-[7px] text-[16px] font-medium leading-[1] text-secondary"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
