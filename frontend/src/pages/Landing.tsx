import { useTranslation } from 'react-i18next';
import {
  Search01Icon,
  Brain01Icon,
  LicenseIcon,
} from '@hugeicons/core-free-icons';
import { Hero } from '../components/Hero';
import { StatsBar } from '../components/StatsBar';
import { FeatureCard } from '../components/FeatureCard';
import { TermCardCarousel } from '../components/TermCardCarousel';

export function Landing() {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <Hero />

      <section className="w-full pb-[80px]">
        <p className="text-center text-[14px] text-border tracking-wider mb-6">
          {t('landing.termExamples')}
        </p>
        <TermCardCarousel />
      </section>

      <StatsBar />

      <section className="w-full py-[80px] px-6">
        <h2 className="text-center text-[28px] font-medium text-text mb-12 max-md:text-[22px]">
          {t('landing.allTools')}
        </h2>
        <div className="mx-auto max-w-[1280px] flex flex-wrap justify-center gap-8">
          <FeatureCard
            icon={Search01Icon}
            title={t('landing.feature1Title')}
            description={t('landing.feature1Desc')}
          />
          <FeatureCard
            icon={Brain01Icon}
            title={t('landing.feature2Title')}
            description={t('landing.feature2Desc')}
          />
          <FeatureCard
            icon={LicenseIcon}
            title={t('landing.feature3Title')}
            description={t('landing.feature3Desc')}
          />
        </div>
      </section>
    </div>
  );
}
