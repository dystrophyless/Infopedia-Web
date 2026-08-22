import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDown01Icon,
  Bookmark02Icon,
  BookOpen01Icon,
  BookOpen02Icon,
  DocumentAttachmentIcon,
  LockPasswordIcon,
  Mail01Icon,
  SearchList01Icon,
  ViewIcon,
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
  return null;
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
    <section className="box-border min-h-[656px] overflow-hidden bg-[#efebf6] pb-[168px] pt-[124px] text-center">
      <div data-desktop-content-rail className="mx-auto flex w-full max-w-[1152px] flex-col items-center px-[24px] min-[1440px]:max-w-[1120px] min-[1440px]:px-0">
        <p className="text-[16px] font-medium uppercase leading-none tracking-[0.02em] text-[#6e6779]">
          {t('landing.desktopEyebrow', { defaultValue: 'ЕДИНЫЙ ИСТОЧНИК ДЛЯ ПОДГОТОВКИ' })}
        </p>
        <h1 className="mt-6 text-[72px] font-medium leading-[72px] text-[#161519] max-lg:text-[60px] max-lg:leading-[60px]">
          {t('landing.desktopHeroLine1', { defaultValue: 'Знания всех книг' })}
          <br />
          <span>
            {t('landing.desktopHeroLine2Lead', { defaultValue: 'в ' })}
            <span className="text-[#6a37c3]">
              {t('landing.desktopHeroLine2Accent', { defaultValue: 'одном приложении' })}
            </span>
          </span>
        </h1>
        <p className="mt-6 max-w-[760px] text-[24px] leading-6 text-[#524d5b] max-lg:text-[20px] max-lg:leading-5">
          {t('landing.desktopHeroSubtitle', {
            defaultValue:
              'Мы собрали все 15 книг, по которым приходят вопросы ЕНТ, в одну базу. У каждого ответа — цитата, страница и название книги.',
          })}
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            to={landingCtaTarget('/search', isAuthenticated)}
            className="flex h-[48px] w-[200px] items-center justify-center rounded-[16px] bg-[#6a37c3] px-4 text-[14px] font-medium leading-[14px] text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6a37c3]"
          >
            {t('landing.mobileHeroPrimaryCta')}
          </Link>
          <a
            href="#desktop-analysis"
            className="flex h-[48px] w-[200px] items-center justify-center rounded-[16px] bg-white px-4 text-[14px] font-medium leading-[14px] text-[#524d5b] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6a37c3]"
          >
            {t('landing.mobileHeroSecondaryCta')}
          </a>
        </div>
      </div>
    </section>
  );
}

function DesktopGuestSections({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <>
      <DesktopFeatureCards />
      <DesktopSourceProof isAuthenticated={isAuthenticated} />
      <DesktopEntAnalysis isAuthenticated={isAuthenticated} />
    </>
  );
}

function DesktopFeatureCards() {
  const { t } = useTranslation();
  const features = [
    {
      image: '/mobile-feature-weak-topics.png',
      title: t('landing.mobileToolWeakTopicsTitle'),
      description: t('landing.mobileToolWeakTopicsDesc'),
    },
    {
      image: '/mobile-feature-tests.png',
      title: t('landing.mobileToolTestsTitle'),
      description: t('landing.mobileToolTestsDesc'),
    },
    {
      image: '/mobile-feature-term.png',
      title: t('landing.mobileToolTermTitle'),
      description: t('landing.mobileToolTermDesc'),
    },
  ];

  return (
    <section id="tools" data-nav-section className="overflow-hidden bg-[#efebf6] pb-[64px]">
      <div data-desktop-content-rail className="mx-auto w-full max-w-[1152px] px-[24px] min-[1440px]:max-w-[1120px] min-[1440px]:px-0">
        <div className="flex w-full items-end">
          <h2 className="text-[48px] font-medium leading-[48px] text-[#161519]">
            {t('landing.desktopToolsTitleLead', { defaultValue: 'Всё, что нужно для подготовки' })}
            <br />
            <span className="text-[#6a37c3]">
              {t('landing.desktopToolsTitleAccent', { defaultValue: 'в одном месте' })}
            </span>
          </h2>
        </div>
        <div className="mt-10 w-full overflow-visible">
          <div id="desktop-feature-rail" className="h-[517px] w-full overflow-visible">
            <div className="grid h-full w-full min-w-0 grid-cols-3 gap-[32px]">
              {features.map((feature) => (
                <Link
                  key={feature.image}
                  to={ONBOARDING_TARGET}
                  className="group relative flex h-[493px] min-w-0 flex-col overflow-hidden rounded-[16px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6a37c3]"
                >
                  <div className="absolute inset-x-0 bottom-[64px] top-[93px] rounded-[16px] bg-white" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-[300px] items-center justify-center overflow-hidden">
                    <img
                      src={feature.image}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-contain transition-transform duration-200 ease-out group-hover:scale-[1.01] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  </div>
                  <div className="absolute inset-x-8 bottom-[92px] z-20">
                    <h3 className="text-[20px] font-medium leading-5 text-[#6a37c3]">{feature.title}</h3>
                    <p className="mt-3 text-[16px] leading-4 text-[#8c8698]">{feature.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DesktopSourceProof({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { t } = useTranslation();

  return (
    <section id="featured-terms" data-nav-section className="bg-[#efebf6] pb-[88px]">
      <div data-desktop-content-rail className="mx-auto w-full max-w-[1152px] px-[24px] min-[1440px]:max-w-[1120px] min-[1440px]:px-0">
        <h2 className="text-[48px] font-medium leading-[48px] text-[#161519]">
          {t('landing.desktopTermsTitleLead', { defaultValue: 'База из 5000+ терминов' })}
          <br />
          <span className="text-[#6a37c3]">
            {t('landing.desktopTermsTitleAccent', { defaultValue: 'в один клик' })}
          </span>
        </h2>

        <div
          data-source-proof-card
          className="mt-10 grid w-full grid-cols-[minmax(0,720px)_minmax(0,400px)] overflow-hidden rounded-[16px] max-lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]"
        >
          <div
            data-source-proof-left
            className="flex w-[720px] max-w-full flex-col items-start justify-center bg-white p-8"
          >
            <h3 className="text-[24px] font-medium leading-6 text-[#161519]">
              {t('landing.desktopSourceTitleLead', { defaultValue: 'Не просто объясняем.' })}
              <br />
              <span className="text-[#6a37c3]">
                {t('landing.desktopSourceTitleAccent', { defaultValue: 'Показываем источник.' })}
              </span>
            </h3>
            <p className="mt-4 max-w-[620px] text-[16px] leading-4 text-[#6e6779]">
              {t('landing.desktopSourceBody', {
                defaultValue:
                  'У каждого термина есть точная ссылка на издание, тему и страницу — поэтому определение легко проверить в учебнике.',
              })}
            </p>
            <Link
              to={landingCtaTarget('/search', isAuthenticated)}
              className="mt-6 flex h-10 items-center justify-center rounded-[8px] bg-[#6a37c3] px-6 text-[16px] font-medium leading-4 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6a37c3]"
            >
              {t('landing.desktopTermsCta', { defaultValue: 'Посмотреть термины →' })}
            </Link>
          </div>
          <div
            data-source-proof-right
            className="flex w-[400px] max-w-full flex-col bg-[#6a37c3] p-8 text-white"
          >
            <h3 className="text-[20px] font-medium leading-5 text-[#efeaf8]">
              {t('landing.desktopSourcePanelTitle', { defaultValue: 'Источник определения' })}
            </h3>
            <div className="my-6 h-px bg-[#865bcf]" />
            <dl className="grid gap-4 text-[16px] leading-4">
              {[
                [t('landing.mobileSourceEdition'), t('landing.desktopSourceEditionValue', { defaultValue: 'Атамұра, 9-класс' })],
                [t('landing.mobileSourceTopic'), t('landing.desktopSourceTopicValue', { defaultValue: '2.1. Сетевой этикет' })],
                [t('landing.mobileSourcePage'), t('landing.desktopSourcePageValue', { defaultValue: '26' })],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-5">
                  <dt className="text-[#ded2f1]">{label}</dt>
                  <dd className="text-right font-medium text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[16px]">
          <TermCardCarousel variant="guestLanding" />
        </div>
      </div>
    </section>
  );
}

function DesktopEntAnalysis({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { t } = useTranslation();
  const steps = [
    {
      number: 1,
      title: t('landing.desktopAnalyzeStep1Title', { defaultValue: 'Регистрация' }),
      description: t('landing.desktopAnalyzeStep1Body', {
        defaultValue: 'Не занимает много времени, 30 секунд',
      }),
    },
    {
      number: 2,
      title: t('landing.desktopAnalyzeStep2Title', { defaultValue: 'Загрузите файл' }),
      description: t('landing.desktopAnalyzeStep2Body', {
        defaultValue: 'Скачайте файл со статистикой тем вашего ЕНТ в личном кабинете тестцентра и загрузите его',
      }),
    },
    {
      number: 3,
      title: t('landing.desktopAnalyzeStep3Title', { defaultValue: 'Данные готовы' }),
      description: t('landing.desktopAnalyzeStep3Body', {
        defaultValue: 'Мы персонализируем подготовку и наглядно покажем, где вы ошибаетесь чаще всего',
      }),
    },
  ];

  return (
    <section id="desktop-analysis" data-nav-section className="bg-[#efebf6] pb-[220px]">
      <div data-desktop-content-rail className="mx-auto w-full max-w-[1152px] px-[24px] min-[1440px]:max-w-[1120px] min-[1440px]:px-0">
        <div data-analysis-stage className="grid gap-6 md:grid-cols-2 xl:relative xl:block xl:h-[327px]">
          <h2 className="text-[48px] font-medium leading-[48px] text-[#161519] md:col-span-2 xl:absolute xl:left-0 xl:top-0">
            {t('landing.desktopAnalyzeTitleLead', { defaultValue: 'Проанализируйте свой ЕНТ' })}
            <br />
            <span className="text-[#6a37c3]">
              {t('landing.desktopAnalyzeTitleAccent', { defaultValue: 'за 5 минут' })}
            </span>
          </h2>
          <div data-analysis-snippet="result" className="rounded-[8px] bg-white p-6 md:col-start-2 md:row-start-2 md:w-[292px] md:justify-self-end xl:absolute xl:left-[803px] xl:top-0 xl:w-[292px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium leading-[14px] text-[#161519]">
                  {t('landing.desktopAnalyzeResultTopic', { defaultValue: 'Веб-проектирование' })}
                </p>
                <p className="mt-1 text-[10px] leading-[10px] text-[#8c8698]">
                  {t('landing.desktopAnalyzeResultScore', { defaultValue: '1 из 5 баллов — 20%' })}
                </p>
              </div>
              <span className="text-[10px] leading-[10px] text-[#bc251a]">
                {t('landing.desktopAnalyzeResultLost', { defaultValue: 'Потеряно 4 балла' })}
              </span>
            </div>
            <div className="my-4 h-px bg-[#f6f5f7]" />
            <div className="px-2">
              <p className="text-[12px] font-medium leading-3 text-[#6a37c3]">
                {t('landing.desktopAnalyzeResultPrep', { defaultValue: 'Все темы для подготовки' })}
              </p>
              <p className="mt-1 text-[10px] leading-[10px] text-[#a585db]">
                {t('landing.desktopAnalyzeResultGrade', { defaultValue: 'Материалы 10 класса' })}
              </p>
              <ul className="mt-4 grid gap-2 text-[10px] leading-[10px] text-[#6e6779]">
                {[
                  t('landing.desktopAnalyzeResultItem1', { defaultValue: 'Использование HTML-тегов при создании веб-страниц' }),
                  t('landing.desktopAnalyzeResultItem2', { defaultValue: 'Использование CSS для создания веб-страниц' }),
                  t('landing.desktopAnalyzeResultItem3', { defaultValue: 'Использование готовых скриптов при создании веб-страниц' }),
                  t('landing.desktopAnalyzeResultItem4', { defaultValue: 'Использование HTML-тегов для вставки мультимедийных объектов на веб-страницу' }),
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <HugeiconsIcon icon={BookOpen01Icon} size={16} strokeWidth={1.6} className="shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to={landingCtaTarget('/practice-by-topic', isAuthenticated)}
              className="mt-6 flex h-8 w-full items-center justify-center rounded-[8px] bg-[#6a37c3] px-4 text-[12px] font-medium leading-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]"
            >
              {t('landing.desktopAnalyzeResultCta', { defaultValue: 'Начать практику →' })}
            </Link>
          </div>

          <div data-analysis-snippet="registration" className="grid w-full max-w-[284px] gap-2 md:col-start-1 md:row-start-2 md:self-end xl:absolute xl:left-[29px] xl:top-[223px] xl:h-[88px] xl:w-[284px] xl:max-w-none">
            <div className="flex h-10 items-center gap-4 rounded-[8px] bg-white px-6 text-[14px] text-[#c5b1e7]">
              <HugeiconsIcon icon={Mail01Icon} size={16} strokeWidth={1.7} aria-hidden="true" />
              <span>{t('landing.desktopAnalyzeEmail', { defaultValue: 'Электронная почта' })}</span>
            </div>
            <div className="flex h-10 items-center justify-between rounded-[8px] bg-white px-6 text-[14px] text-[#c5b1e7]">
              <span className="flex items-center gap-4">
                <HugeiconsIcon icon={LockPasswordIcon} size={16} strokeWidth={1.7} aria-hidden="true" />
                <span>{t('landing.desktopAnalyzePassword', { defaultValue: 'Пароль' })}</span>
              </span>
              <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={1.7} aria-hidden="true" />
            </div>
          </div>

          <div data-analysis-snippet="upload" className="flex h-44 w-full max-w-[300px] flex-col items-center justify-center gap-4 rounded-[8px] border-[1.5px] border-dashed border-[#a585db] bg-white px-6 text-center md:col-span-2 md:mx-auto xl:absolute xl:left-[410px] xl:top-[135px] xl:m-0 xl:h-[176px] xl:w-[300px] xl:max-w-none">
            <span className="flex size-12 items-center justify-center rounded-full bg-[#ded2f1] text-[#6a37c3]">
              <HugeiconsIcon icon={DocumentAttachmentIcon} size={24} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[14px] font-medium leading-[14px] text-[#161519]">
                {t('landing.desktopAnalyzeUpload', { defaultValue: 'Нажмите, чтобы загрузить файл' })}
              </p>
              <p className="mt-2 text-[12px] leading-3 text-[#a585db]">
                {t('landing.desktopAnalyzeUploadHelp', { defaultValue: 'Не знаете как его получить? Узнать' })}
              </p>
            </div>
          </div>
        </div>

        <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 xl:mt-0 xl:gap-12">
          {steps.map((step) => (
            <li key={step.number} className="flex flex-col items-center gap-4 px-6 py-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#6a37c3] text-[24px] font-medium leading-6 text-[#ded2f1]">
                {step.number}
              </span>
              <h3 className="text-[20px] font-medium leading-5 text-[#161519]">{step.title}</h3>
              <p className="max-w-[300px] text-[16px] leading-4 text-[#6e6779]">{step.description}</p>
            </li>
          ))}
        </ol>
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
