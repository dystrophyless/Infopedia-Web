import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Bookmark02Icon,
  BookOpen01Icon,
  BookOpen02Icon,
  ChartColumnIcon,
  Search01Icon,
  SearchList01Icon,
} from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLangStore, type Language } from '../stores/langStore';
import { Hero } from '../components/Hero';
import { StatsBar } from '../components/StatsBar';
import { FeatureCard } from '../components/FeatureCard';
import { MobileFeatureCarousel } from '../components/MobileFeatureCarousel';
import { TermCardCarousel } from '../components/TermCardCarousel';
import { SearchChoiceModal } from '../components/SearchChoiceModal';
import {
  FigmaFeatureAnalyticsIcon,
  FigmaFeatureDescriptionIcon,
  FigmaFeatureSearchIcon,
} from '../components/FigmaIcons';

const ONBOARDING_TARGET = '/onboarding';

function authTarget(path: string, isAuthenticated: boolean): string {
  if (isAuthenticated) return path;
  return `/login?next=${encodeURIComponent(path)}`;
}

export function Landing() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="w-full">
      <div className="md:hidden">
        <MobileHome />
      </div>

      <div className="hidden md:block">
        {isAuthenticated ? <DesktopAuthenticatedLanding /> : <DesktopGuestLanding />}
      </div>
    </div>
  );
}

function DesktopAuthenticatedLanding() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <>
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
            to={authTarget('/analyze', isAuthenticated)}
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
    </>
  );
}

function DesktopGuestLanding() {
  return (
    <>
      <DesktopGuestHero />
      <DesktopGuestSections />
    </>
  );
}

function DesktopGuestHero() {
  const { t } = useTranslation();

  return (
    <section className="overflow-hidden bg-[#efebf6] px-6 pb-16 pt-12">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-[190px] font-medium leading-[0.82] text-[#161519]">
            {t('landing.mobileHeroScoreValue')}
          </p>
          <p className="text-[18px] leading-none text-[#6e6779]">
            {t('landing.mobileHeroScoreLabel')}
          </p>
        </div>

        <div className="flex max-w-[820px] flex-col items-center gap-5">
          <h1 className="text-[56px] font-medium leading-[1.05] text-[#161519]">
            {t('landing.mobileHeroTitle')}
          </h1>
          <p className="text-[20px] leading-none text-[#6e6779]">
            {t('landing.mobileHeroSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to={ONBOARDING_TARGET}
            className="flex min-h-[56px] min-w-[240px] items-center justify-center rounded-[18px] bg-[#6a37c3] px-8 text-[18px] font-medium leading-tight text-white transition-opacity hover:opacity-90"
          >
            {t('landing.mobileHeroPrimaryCta')}
          </Link>
          <a
            href="#tools"
            className="flex min-h-[56px] min-w-[180px] items-center justify-center rounded-[18px] bg-[#fbfbfb] px-8 text-[18px] font-medium leading-tight text-[#524d5b] transition-opacity hover:opacity-90"
          >
            {t('landing.mobileHeroSecondaryCta')}
          </a>
        </div>
      </div>
    </section>
  );
}

function DesktopGuestSections() {
  const { t } = useTranslation();

  return (
    <>
      <section
        id="featured-terms"
        className="scroll-mt-[112px] overflow-hidden bg-[#efebf6] pb-20 pt-12"
      >
        <div className="flex flex-col gap-8">
          <p className="text-center text-[14px] font-medium uppercase leading-none text-[#6e6779]">
            {t('landing.termExamples')}
          </p>
          <div className="w-full overflow-hidden">
            <TermCardCarousel variant="guestDesktop" />
          </div>
        </div>
      </section>

      <DesktopSourceProof />
      <DesktopToolsFeature isAuthenticated={false} />
    </>
  );
}

function DesktopSourceProof() {
  const { t } = useTranslation();
  const sourceLabels = [
    {
      label: t('landing.mobileSourceEdition', { defaultValue: 'Edition' }),
      icon: BookOpen02Icon,
    },
    {
      label: t('landing.mobileSourceTopic', { defaultValue: 'Topic' }),
      icon: Bookmark02Icon,
    },
    {
      label: t('landing.mobileSourcePage', { defaultValue: 'Page' }),
      icon: SearchList01Icon,
    },
  ];

  return (
    <section className="bg-[#efebf6] px-6 pb-16 pt-14">
      <div className="mx-auto flex w-full max-w-[920px] flex-col items-start gap-5">
        <div className="grid min-h-[204px] w-full grid-cols-[minmax(0,1fr)_10px_minmax(220px,260px)] max-lg:grid-cols-[minmax(0,1fr)_8px_minmax(200px,240px)]">
          <div className="flex flex-col justify-center rounded-l-[24px] rounded-r-none bg-surface px-10 py-8 max-lg:px-8 max-lg:py-7">
            <p className="text-[20px] leading-none text-[#6e6779] max-lg:text-[18px]">
              {t('landing.mobileSourceGuess')}
            </p>
            <h2 className="mt-2 text-[40px] font-medium leading-[0.98] text-[#6a37c3] max-lg:text-[32px]">
              {t('landing.mobileSourceCite')}
            </h2>
            <p className="mt-5 max-w-[520px] text-[18px] leading-[1.2] text-[#6e6779] max-lg:text-[16px]">
              {t('landing.mobileSourceBody')}
            </p>
          </div>

          <div aria-hidden="true" />

          <div className="flex rounded-l-none rounded-r-[24px] bg-surface">
            <span aria-hidden="true" className="w-2 self-stretch bg-[#6a37c3]" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 py-8 pl-7 pr-8 max-lg:pr-6">
              {sourceLabels.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <HugeiconsIcon
                    icon={item.icon}
                    size={22}
                    strokeWidth={1.8}
                    className="shrink-0 text-[#6a37c3]"
                  />
                  <span className="min-w-0 text-[20px] leading-none text-[#6e6779] max-lg:text-[18px]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Link
          to={ONBOARDING_TARGET}
          className="flex h-14 min-w-[240px] items-center justify-center rounded-[16px] bg-[#6a37c3] px-6 text-[16px] font-medium leading-tight text-white transition-opacity hover:opacity-90"
        >
          {t('landing.mobileHeroPrimaryCta')}
        </Link>
      </div>
    </section>
  );
}

function DesktopToolsFeature({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation();

  return (
    <section id="tools" className="scroll-mt-[112px] overflow-hidden bg-[#efebf6] px-6 pb-24 pt-16">
      <div className="mx-auto flex max-w-[980px] flex-col items-center gap-12">
        <div className="flex max-w-[760px] flex-col gap-6 text-center">
          <h2 className="text-[44px] font-medium leading-[1.08] text-[#161519]">
            {t('landing.mobileToolsTitle')}
          </h2>
          <p className="text-[18px] leading-[1.25] text-[#6e6779]">
            {t('landing.mobileToolsSubtitle')}
          </p>
        </div>

        <MobileFeatureCarousel isAuthenticated={isAuthenticated} variant="desktop" />
      </div>
    </section>
  );
}

function MobileHome() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return isAuthenticated ? <MobileAppHome /> : <MobileConversionHeroHome />;
}

function MobileConversionHeroHome() {
  const { t } = useTranslation();

  return (
    <>
      <header className="box-border w-full bg-[#efebf6] px-6 pb-5 pt-[calc(30px+env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-[366px] items-center justify-between gap-3">
          <img src="/logo.svg" alt="Infopedia" className="h-6 w-auto" />
          <div className="flex shrink-0 items-center gap-2">
            <MobileHeroLanguageToggle />
            <Link
              to="/login"
              className="flex h-10 min-w-[78px] items-center justify-center rounded-[10px] bg-[#44237d] px-4 text-[12px] font-normal leading-none text-white"
            >
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </header>

      <section className="box-border w-full overflow-hidden bg-[#efebf6] px-6 pb-14 pt-7">
        <div className="mx-auto flex w-full max-w-[366px] flex-col items-center gap-8 text-center">
          <div className="flex flex-col items-center gap-1">
            <p className="text-[80px] font-medium leading-[0.9] text-[#161519]">
              {t('landing.mobileHeroScoreValue')}
            </p>
            <p className="text-[14px] leading-none text-[#6e6779]">
              {t('landing.mobileHeroScoreLabel')}
            </p>
          </div>

          <div className="flex max-w-[330px] flex-col items-center gap-4">
            <h1 className="text-[24px] font-medium leading-[1.06] text-[#161519]">
              {t('landing.mobileHeroTitle')}
            </h1>
            <p className="text-[14px] leading-none text-[#6e6779]">
              {t('landing.mobileHeroSubtitle')}
            </p>
          </div>

          <div className="grid w-full gap-2">
            <Link
              to={ONBOARDING_TARGET}
              className="flex min-h-12 items-center justify-center rounded-[16px] bg-[#6a37c3] px-5 text-[14px] font-medium leading-tight text-white"
            >
              {t('landing.mobileHeroPrimaryCta')}
            </Link>
            <a
              href="#mobile-tools"
              className="flex min-h-12 items-center justify-center rounded-[16px] bg-[#fbfbfb] px-5 text-[14px] font-medium leading-tight text-[#524d5b]"
            >
              {t('landing.mobileHeroSecondaryCta')}
            </a>
          </div>
        </div>
      </section>

      <MobileFigmaGuestSections />
    </>
  );
}

function MobileFigmaGuestSections() {
  const { t } = useTranslation();

  return (
    <>
      <section id="mobile-proof" className="box-border w-screen max-w-full overflow-hidden bg-[#efebf6] py-8">
        <div className="flex flex-col gap-7">
          <p className="text-center text-[14px] font-medium uppercase leading-none text-[#6e6779]">
            {t('landing.termExamples')}
          </p>
          <div className="w-full overflow-hidden">
            <TermCardCarousel variant="guest" />
          </div>
        </div>
      </section>

      <MobileSourceProof />
      <MobileToolsFeature isAuthenticated={false} />
    </>
  );
}

function MobileAppHome() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const quickActions = [
    {
      title: t('landing.mobileDictionaryTitle', { defaultValue: 'Dictionary Lookup' }),
      description: t('landing.mobileDictionaryDescription', {
        defaultValue: 'Search exact informatics terminology',
      }),
      to: authTarget('/search', isAuthenticated),
      icon: BookOpen01Icon,
    },
    {
      title: t('landing.mobileMockExamTitle', { defaultValue: 'Mock Exam Analysis' }),
      description: t('landing.mobileMockExamDescription', {
        defaultValue: 'Review performance and weak areas',
      }),
      to: authTarget('/analyze', isAuthenticated),
      icon: ChartColumnIcon,
    },
  ];

  return (
    <>
      <section className="min-h-screen overflow-hidden bg-bg px-4 pb-3 pt-[calc(30px+env(safe-area-inset-top))]">
        <header>
          <h1 className="text-[28px] font-medium leading-none text-primary">
            {t('landing.mobileWorkspaceTitle', { defaultValue: 'Workspace' })}
          </h1>
          <p className="mt-2 text-[13px] leading-none text-text-body">
            {t('landing.mobileWorkspaceSubtitle', {
              defaultValue: 'UNT Informatics Preparation',
            })}
          </p>
        </header>

        <section className="mt-7" aria-labelledby="mobile-terms-title">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="mobile-terms-title"
              className="text-[19px] font-medium leading-none text-primary"
            >
              {t('landing.mobileTermsTitle', { defaultValue: 'Terms of the Day' })}
            </h2>
            <Link
              to={authTarget('/search', isAuthenticated)}
              className="flex min-h-[32px] items-center gap-1 rounded-[8px] px-1 text-[12px] font-medium leading-none text-secondary"
            >
              <span>{t('landing.mobileTermsViewAll', { defaultValue: 'View All' })}</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.8} />
            </Link>
          </div>
          <div className="-mr-4 mt-4">
            <TermCardCarousel variant="home" />
          </div>
        </section>

        <section className="mt-6" aria-labelledby="mobile-quick-actions-title">
          <h2
            id="mobile-quick-actions-title"
            className="text-[19px] font-medium leading-none text-primary"
          >
            {t('landing.mobileQuickActionsTitle', { defaultValue: 'Quick Actions' })}
          </h2>

          <div className="mt-4 grid gap-3">
            <button
              type="button"
              className="grid min-h-[52px] w-full grid-cols-[34px_minmax(0,1fr)] items-center gap-3 rounded-[8px] border border-[#e8e1ee] bg-surface px-4 text-left"
              onClick={() => setSearchModalOpen(true)}
            >
              <HugeiconsIcon
                icon={Search01Icon}
                size={19}
                strokeWidth={1.9}
                className="text-primary"
              />
              <span className="min-w-0 truncate text-[12px] leading-none text-muted">
                {t('landing.mobileConceptSearchPlaceholder', {
                  defaultValue: 'Describe a concept to find its term...',
                })}
              </span>
            </button>

            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="grid min-h-[68px] grid-cols-[44px_minmax(0,1fr)_18px] items-center gap-3 rounded-[8px] border border-[#e8e1ee] bg-surface px-4 py-3 text-left"
              >
                <span className="flex size-[44px] items-center justify-center rounded-full bg-bg text-primary">
                  <HugeiconsIcon icon={action.icon} size={21} strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[16px] font-medium leading-tight text-text">
                    {action.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-text-body">
                    {action.description}
                  </span>
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={18}
                  strokeWidth={1.8}
                  className="text-muted"
                />
              </Link>
            ))}
          </div>
        </section>
      </section>

      {searchModalOpen && (
        <SearchChoiceModal
          termSearchTo={authTarget('/search', isAuthenticated)}
          descriptionSearchTo={authTarget('/semantic-search', isAuthenticated)}
          onClose={() => setSearchModalOpen(false)}
        />
      )}
    </>
  );
}

function MobileSourceProof() {
  const { t } = useTranslation();
  const sourceLabels = [
    {
      label: t('landing.mobileSourceEdition', { defaultValue: 'Edition' }),
      icon: BookOpen02Icon,
    },
    {
      label: t('landing.mobileSourceTopic', { defaultValue: 'Topic' }),
      icon: Bookmark02Icon,
    },
    {
      label: t('landing.mobileSourcePage', { defaultValue: 'Page' }),
      icon: SearchList01Icon,
    },
  ];

  return (
    <section id="mobile-source-proof" className="box-border w-screen max-w-full bg-[#efebf6] px-5 py-4 min-[430px]:px-8">
      <div className="mx-auto flex w-full max-w-[366px] flex-col gap-4">
        <div className="grid min-h-[128px] grid-cols-[minmax(0,240px)_8px_minmax(100px,118px)]">
          <div className="flex flex-col rounded-l-[16px] rounded-r-none bg-surface pl-6 pr-[22px] pt-8 pb-5">
            <div className="flex flex-col gap-[2px]">
              <p className="text-[14px] leading-none text-[#6e6779]">
                {t('landing.mobileSourceGuess')}
              </p>
              <h2 className="text-[20px] font-medium leading-none text-[#6a37c3]">
                {t('landing.mobileSourceCite')}
              </h2>
            </div>
            <p className="mt-[8px] max-w-[194px] text-[12px] leading-[12px] text-[#6e6779]">
              {t('landing.mobileSourceBody')}
            </p>
          </div>

          <div aria-hidden="true" />

          <div className="flex rounded-l-none rounded-r-[16px] bg-surface">
            <span aria-hidden="true" className="w-1 self-stretch bg-[#6a37c3]" />
            <div className="flex flex-col gap-[10px] py-[34px] pl-[18px] pr-4">
              {sourceLabels.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={item.icon}
                    size={12}
                    strokeWidth={1.8}
                    className="shrink-0 text-[#6a37c3]"
                  />
                  <span className="min-w-0 text-[12px] leading-[14px] text-[#6e6779]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Link
          to={ONBOARDING_TARGET}
          className="flex h-12 w-full items-center justify-center rounded-[16px] bg-[#6a37c3] px-5 text-[14px] font-medium leading-tight text-white"
        >
          {t('landing.mobileHeroPrimaryCta')}
        </Link>
      </div>
    </section>
  );
}

function MobileToolsFeature({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation();

  return (
    <section id="mobile-tools" className="box-border w-screen max-w-full overflow-hidden bg-[#efebf6] px-6 py-14">
      <div className="mx-auto flex w-full max-w-[366px] flex-col gap-10">
        <div className="flex flex-col gap-6 text-center">
          <h2 className="text-[24px] font-medium leading-[1.12] text-[#161519]">
            {t('landing.mobileToolsTitle')}
          </h2>
          <p className="text-[14px] leading-none text-[#6e6779]">
            {t('landing.mobileToolsSubtitle')}
          </p>
        </div>

        <MobileFeatureCarousel isAuthenticated={isAuthenticated} />
      </div>
    </section>
  );
}

function MobileHeroLanguageToggle() {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const nextLang: Language = lang === 'ru' ? 'kk' : 'ru';

  return (
    <button
      type="button"
      aria-label={t('common.language')}
      className="flex h-8 items-center justify-center gap-[5px] px-3 text-[12px] leading-none text-[#8c8698]"
      onClick={() => setLang(nextLang)}
    >
      <span>{lang.toUpperCase()}</span>
      <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} />
    </button>
  );
}
