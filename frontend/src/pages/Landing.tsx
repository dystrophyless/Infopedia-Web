import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDown01Icon,
  Bookmark02Icon,
  BookOpen02Icon,
  SearchList01Icon,
} from '@hugeicons/core-free-icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLangStore, type Language } from '../stores/langStore';
import { MobileFeatureCarousel } from '../components/MobileFeatureCarousel';
import { TermCardCarousel } from '../components/TermCardCarousel';
const ONBOARDING_TARGET = '/onboarding';

function landingCtaTarget(path: string, isAuthenticated: boolean): string {
  return isAuthenticated ? path : ONBOARDING_TARGET;
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <DesktopGuestLanding isAuthenticated={isAuthenticated} />;
}

function DesktopGuestLanding({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <>
      <DesktopGuestHero isAuthenticated={isAuthenticated} />
      <DesktopGuestSections isAuthenticated={isAuthenticated} />
    </>
  );
}

function DesktopGuestHero({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { t } = useTranslation();

  return (
    <section className="overflow-hidden bg-[#efebf6] px-6 pb-16 pt-12">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-[190px] font-medium leading-none text-[#161519]">
            {t('landing.mobileHeroScoreValue')}
          </p>
          <p className="text-[18px] leading-none text-[#6e6779]">
            {t('landing.mobileHeroScoreLabel')}
          </p>
        </div>

        <div className="flex max-w-[820px] flex-col items-center gap-5">
          <h1 className="text-[56px] font-medium leading-none text-[#161519]">
            {t('landing.mobileHeroTitle')}
          </h1>
          <p className="text-[20px] leading-none text-[#6e6779]">
            {t('landing.mobileHeroSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to={landingCtaTarget('/search', isAuthenticated)}
            className="flex min-h-[56px] min-w-[240px] items-center justify-center rounded-[18px] bg-[#6a37c3] px-8 text-[18px] font-medium leading-none text-white transition-opacity hover:opacity-90"
          >
            {t('landing.mobileHeroPrimaryCta')}
          </Link>
          <a
            href="#tools"
            className="flex min-h-[56px] min-w-[180px] items-center justify-center rounded-[18px] bg-[#fbfbfb] px-8 text-[18px] font-medium leading-none text-[#524d5b] transition-opacity hover:opacity-90"
          >
            {t('landing.mobileHeroSecondaryCta')}
          </a>
        </div>
      </div>
    </section>
  );
}

function DesktopGuestSections({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { t } = useTranslation();

  return (
    <>
      <section
        id="featured-terms"
        className="scroll-mt-[112px] overflow-hidden bg-[#efebf6] pb-20 pt-12"
      >
        <div className="flex flex-col gap-8">
          <p className="text-center text-[14px] font-medium uppercase leading-none text-text-body">
            {t('landing.termExamples')}
          </p>
          <div className="w-full overflow-hidden">
            <TermCardCarousel variant="guestDesktop" />
          </div>
        </div>
      </section>

      <DesktopSourceProof isAuthenticated={isAuthenticated} />
      <DesktopToolsFeature isAuthenticated={isAuthenticated} />
    </>
  );
}

function DesktopSourceProof({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
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
            <h2 className="mt-2 text-[40px] font-medium leading-none text-[#6a37c3] max-lg:text-[32px]">
              {t('landing.mobileSourceCite')}
            </h2>
            <p className="mt-5 max-w-[520px] text-[18px] leading-none text-[#6e6779] max-lg:text-[16px]">
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
          to={landingCtaTarget('/search', isAuthenticated)}
          className="flex h-14 min-w-[240px] items-center justify-center rounded-[16px] bg-[#6a37c3] px-6 text-[16px] font-medium leading-none text-white transition-opacity hover:opacity-90"
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
          <h2 className="text-[44px] font-medium leading-none text-[#161519]">
            {t('landing.mobileToolsTitle')}
          </h2>
          <p className="text-[18px] leading-none text-[#6e6779]">
            {t('landing.mobileToolsSubtitle')}
          </p>
        </div>

        <MobileFeatureCarousel isAuthenticated={isAuthenticated} variant="desktop" />
      </div>
    </section>
  );
}

function MobileHome() {
  return <MobileConversionHeroHome />;
}

function MobileConversionHeroHome() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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
            <p className="text-[80px] font-medium leading-none text-[#161519]">
              {t('landing.mobileHeroScoreValue')}
            </p>
            <p className="text-[14px] leading-none text-[#6e6779]">
              {t('landing.mobileHeroScoreLabel')}
            </p>
          </div>

          <div className="flex max-w-[330px] flex-col items-center gap-4">
            <h1 className="text-[24px] font-medium leading-none text-[#161519]">
              {t('landing.mobileHeroTitle')}
            </h1>
            <p className="text-[14px] leading-none text-[#6e6779]">
              {t('landing.mobileHeroSubtitle')}
            </p>
          </div>

          <div className="grid w-full gap-2">
            <Link
              to={landingCtaTarget('/search', isAuthenticated)}
              className="flex min-h-12 items-center justify-center rounded-[16px] bg-[#6a37c3] px-5 text-[14px] font-medium leading-none text-white"
            >
              {t('landing.mobileHeroPrimaryCta')}
            </Link>
            <a
              href="#mobile-tools"
              className="flex min-h-12 items-center justify-center rounded-[16px] bg-[#fbfbfb] px-5 text-[14px] font-medium leading-none text-[#524d5b]"
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <>
      <section id="mobile-proof" className="box-border w-screen max-w-full overflow-hidden bg-[#efebf6] pt-12 pb-[72px]">
        <div className="flex flex-col gap-7">
          <p className="text-center text-[14px] font-medium uppercase leading-none text-[#6e6779]">
            {t('landing.termExamples')}
          </p>
          <div className="w-full overflow-hidden">
            <TermCardCarousel variant="guest" />
          </div>
        </div>
      </section>

      <MobileSourceProof isAuthenticated={isAuthenticated} />
      <MobileToolsFeature isAuthenticated={isAuthenticated} />
    </>
  );
}

function MobileSourceProof({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
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
            <p className="mt-[8px] max-w-[194px] text-[12px] leading-none text-[#6e6779]">
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
                  <span className="min-w-0 text-[12px] leading-none text-[#6e6779]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Link
          to={landingCtaTarget('/search', isAuthenticated)}
          className="flex h-12 w-full items-center justify-center rounded-[16px] bg-[#6a37c3] px-5 text-[14px] font-medium leading-none text-white"
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
          <h2 className="text-[24px] font-medium leading-none text-[#161519]">
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
