import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ChartColumnIcon,
  Delete02Icon,
  HelpCircleIcon,
  LockPasswordIcon,
  Logout01Icon,
  Mail01Icon,
  Profile02Icon,
  Settings01Icon,
  StarIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { useAuthStore } from '../stores/authStore';
import { useLangStore, type Language } from '../stores/langStore';
import { getLatestAnalyzeResult } from '../api/analyze';
import { changeMyPassword, deleteMyAccount, getMe } from '../api/users';
import type { AnalyzeBookCoverage, AnalyzeChapterResult, User } from '../types';
import { FigmaProfileIcon } from '../components/FigmaIcons';
import { SkeletonCard } from '../components/SkeletonCard';
import { AuthPasswordInput, AuthSubmit } from '../components/AuthShell';
import { getPasswordValidationError } from '../utils/passwordValidation';
import { shouldShowProfileLogout, type ProfileTabId } from '../utils/profileTabs';
import { clampScorePercent, getScoreStatus, type ScoreStatus } from '../utils/scoreStatus';
import {
  buildWeakTopicInsights,
  type WeakTopicInsight,
} from '../utils/weakTopics';

const INITIAL_VISIBLE_BOOKS_LIMIT = 3;
const WEAK_TOPICS_PANEL_SECTION_CLASS = 'px-8 py-12 max-md:px-5';
const WEAK_TOPICS_MASTER_DETAIL_GRID_CLASS = 'grid gap-4 lg:h-[320px] lg:grid-cols-[240px_minmax(0,1fr)]';

const profileNavItems: Array<{
  id: ProfileTabId;
  labelKey: string;
  icon: typeof Profile02Icon;
}> = [
  { id: 'profile', labelKey: 'profile.navProfile', icon: Profile02Icon },
  { id: 'progress', labelKey: 'profile.navProgress', icon: ChartColumnIcon },
  { id: 'weakTopics', labelKey: 'profile.navWeakTopics', icon: AlertCircleIcon },
  { id: 'favorites', labelKey: 'profile.navFavorites', icon: StarIcon },
  { id: 'settings', labelKey: 'profile.navSettings', icon: Settings01Icon },
];

const learningStats = [
  {
    labelKey: 'profile.learningStatsTermsViewed',
    value: '0',
    helperKey: 'profile.learningStatsTermsViewedHelper',
  },
  {
    labelKey: 'profile.learningStatsTopicsReviewing',
    value: '0',
    helperKey: 'profile.learningStatsTopicsReviewingHelper',
  },
  {
    labelKey: 'profile.learningStatsFavorites',
    value: '0',
    helperKey: 'profile.learningStatsFavoritesHelper',
  },
] as const;

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(user);
  const [loading, setLoading] = useState(!user);
  const [fetchError, setFetchError] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTabId>('profile');

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((data) => {
        if (!cancelled) {
          if (data.onboarding_completed !== true) {
            setUser(data);
            navigate('/onboarding', { replace: true });
            return;
          }
          setProfile(data);
          setUser(data);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, setUser]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-bg px-6 pb-16 pt-14 max-md:min-h-screen max-md:px-4 max-md:pt-[calc(18px+env(safe-area-inset-top))]">
      <div className="mx-auto max-w-[640px] md:hidden">
        {loading && !profile && <SkeletonCard />}

        {!loading && !profile && fetchError && (
          <p className="rounded-[10px] border border-danger/35 bg-surface p-4 text-[15px] text-danger">
            {t('common.error')}
          </p>
        )}

        {profile && (
          <MobileProfileDashboard
            activeTab={activeTab}
            onLogout={handleLogout}
            onSelectTab={setActiveTab}
            profile={profile}
          />
        )}
      </div>

      <div className="mx-auto grid max-w-[1260px] grid-cols-[300px_minmax(0,1fr)] gap-7 max-lg:grid-cols-1 max-md:hidden">
        <aside
          className="max-lg:mx-auto max-lg:w-full max-lg:max-w-[860px]"
          aria-label={t('profile.title')}
        >
          <section className="rounded-[8px] border border-border/45 bg-surface p-4 shadow-sm max-md:shadow-none">
            <div className="flex items-center gap-3">
              <FigmaProfileIcon className="block size-[56px] shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="truncate text-[24px] font-medium leading-tight text-primary max-sm:text-[22px]">
                  {profile?.username ?? user?.username ?? t('profile.usernameUndefined')}
                </p>
              </div>
            </div>
          </section>

          <nav className="mt-4 flex flex-col gap-2 max-lg:grid max-lg:grid-cols-2 max-sm:grid-cols-1">
            {profileNavItems.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`group flex h-[48px] w-full items-center gap-3 rounded-[8px] border px-4 text-left text-[16px] text-primary transition-colors duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-md:shadow-none ${
                    isActive
                      ? 'border-transparent bg-surface shadow-sm'
                      : 'border-transparent text-primary/80 hover:bg-surface/70 hover:text-primary'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <HugeiconsIcon
                    icon={item.icon}
                    size={22}
                    strokeWidth={1.7}
                    className="shrink-0 transition-transform duration-200 ease-out group-hover:scale-110"
                  />
                  <span className="truncate transition-transform duration-200 ease-out group-hover:translate-x-0.5">
                    {t(item.labelKey)}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="rounded-[8px] border border-border/45 bg-surface shadow-[0_18px_45px_rgba(58,28,110,0.08)] max-lg:mx-auto max-lg:w-full max-lg:max-w-[860px] max-md:shadow-none">
          {loading && !profile && (
            <div className="p-8">
              <SkeletonCard />
            </div>
          )}

          {!loading && !profile && fetchError && (
            <p className="p-8 text-[16px] text-danger">{t('common.error')}</p>
          )}

          {profile && (
            <>
              <header className="border-b border-border/55 px-7 py-5 max-md:px-5">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-[14px] font-medium uppercase leading-none tracking-[0.12em] text-muted">
                      {activeTab === 'weakTopics' ? t('profile.weakTopicsEyebrow') : t('profile.accountArea')}
                    </p>
                    <h1 className="mt-2 text-[38px] font-medium leading-tight text-text max-md:text-[32px]">
                      {getTabTitle(activeTab, t)}
                    </h1>
                  </div>
                  {shouldShowProfileLogout(activeTab) && (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex h-[46px] items-center justify-center gap-3 rounded-[8px] border border-border/55 bg-surface px-5 text-[17px] text-text-body transition-colors hover:bg-bg hover:text-primary max-sm:w-full"
                    >
                      <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={1.7} />
                      {t('profile.logout')}
                    </button>
                  )}
                </div>
              </header>

              {activeTab === 'profile' && <ProfileOverview profile={profile} />}
              {activeTab === 'progress' && <PlaceholderPanel type="progress" />}
              {activeTab === 'weakTopics' && <WeakTopicsPanel />}
              {activeTab === 'favorites' && <PlaceholderPanel type="favorites" />}
              {activeTab === 'settings' && <SettingsPanel profile={profile} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function MobileProfileDashboard({
  activeTab,
  onLogout,
  onSelectTab,
  profile,
}: {
  activeTab: ProfileTabId;
  onLogout: () => void;
  onSelectTab: (tab: ProfileTabId) => void;
  profile: User;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <section className="rounded-[12px] border border-border/45 bg-surface p-4">
        <div className="flex items-center gap-3">
          <FigmaProfileIcon className="block size-[58px] shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="truncate text-[24px] font-medium leading-tight text-primary">
              {profile.username ?? t('profile.usernameUndefined')}
            </p>
            <p className="mt-1 text-[13px] leading-none text-muted">
              {t('profile.profileSummary')}
            </p>
          </div>
        </div>
      </section>

      <nav className="mt-3 grid gap-2" aria-label={t('profile.title')}>
        {profileNavItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`grid min-h-[56px] grid-cols-[32px_minmax(0,1fr)_18px] items-center gap-3 rounded-[12px] border px-4 text-left transition-colors ${
                isActive
                  ? 'border-primary/45 bg-surface text-primary'
                  : 'border-border/40 bg-surface/65 text-primary/80'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <HugeiconsIcon icon={item.icon} size={22} strokeWidth={1.7} />
              <span className="truncate text-[16px] font-medium">{t(item.labelKey)}</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.8} className="text-muted" />
            </button>
          );
        })}
      </nav>

      {shouldShowProfileLogout(activeTab) && (
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex h-[48px] w-full items-center justify-center gap-2 rounded-[12px] border border-border/45 bg-surface text-[15px] font-medium text-primary"
        >
          <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={1.7} />
          {t('profile.logout')}
        </button>
      )}

      <section className="mt-4 rounded-[12px] border border-border/45 bg-surface">
        <header className="border-b border-border/45 px-4 py-4">
          <p className="text-[12px] font-medium uppercase leading-none tracking-[0.1em] text-muted">
            {activeTab === 'weakTopics' ? t('profile.weakTopicsEyebrow') : t('profile.accountArea')}
          </p>
          <h1 className="mt-2 text-[26px] font-medium leading-tight text-text">
            {getTabTitle(activeTab, t)}
          </h1>
        </header>

        {activeTab === 'profile' && <ProfileOverview profile={profile} />}
        {activeTab === 'progress' && <PlaceholderPanel type="progress" />}
        {activeTab === 'weakTopics' && <WeakTopicsPanel />}
        {activeTab === 'favorites' && <PlaceholderPanel type="favorites" />}
        {activeTab === 'settings' && <SettingsPanel profile={profile} />}
      </section>
    </div>
  );
}

function ProfileOverview({
  profile,
}: {
  profile: User;
}) {
  const { t } = useTranslation();

  return (
    <div className="px-8 py-12 max-md:px-5">
      <section className="grid min-h-[320px] grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] items-start gap-6 max-xl:grid-cols-1">
        <div className="h-[320px] overflow-hidden rounded-[8px] bg-bg p-6 max-sm:h-auto max-sm:min-h-[320px]">
          <div className="flex flex-wrap items-center gap-4">
            <FigmaProfileIcon className="block size-[86px] shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium uppercase leading-none tracking-[0.12em] text-muted">
                {t('profile.profileSummary')}
              </p>
              <h2 className="mt-2 truncate text-[34px] font-medium leading-tight text-primary max-md:text-[27px]">
                {profile.username ?? t('profile.usernameUndefined')}
              </h2>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            {learningStats.map((stat) => (
              <div key={stat.labelKey} className="rounded-[8px] bg-surface p-4">
                <p className="text-[30px] font-medium leading-none text-primary">{stat.value}</p>
                <p className="mt-2 text-[14px] leading-tight text-text">{t(stat.labelKey)}</p>
                <p className="mt-1 text-[13px] leading-tight text-muted">{t(stat.helperKey)}</p>
              </div>
            ))}
          </div>
        </div>

        <SubscriptionPromo />
      </section>
    </div>
  );
}

function SubscriptionPromo() {
  const { i18n, t } = useTranslation();
  const isKazakh = i18n.resolvedLanguage?.startsWith('kk') ?? i18n.language.startsWith('kk');
  const priceText = isKazakh ? 'айына 1 490 тг-ден' : 'от 1 490 тг/мес';
  const progressBenefitText = isKazakh
    ? 'Кеңейтілген прогресс динамикасы'
    : 'Расширенная динамика прогресса';
  const benefits = [
    {
      icon: AlertCircleIcon,
      label: t('profile.subscriptionBenefitWeakTopics'),
    },
    {
      icon: StarIcon,
      label: t('profile.subscriptionBenefitRecommendations'),
    },
    {
      icon: ChartColumnIcon,
      label: progressBenefitText,
    },
  ] as const;

  return (
    <section className="flex h-[320px] flex-col overflow-hidden rounded-[8px] border border-border/65 bg-surface p-5 max-sm:h-auto max-sm:min-h-[320px]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[22px] font-medium leading-tight text-primary">
            {t('profile.subscriptionTitle')}
          </h2>
          <span className="mt-2 block text-[13px] font-medium leading-none text-primary">
            {priceText}
          </span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[13px] font-medium leading-none text-surface">
          <HugeiconsIcon icon={StarIcon} size={14} strokeWidth={2} />
          {t('profile.subscriptionBadge')}
        </span>
      </div>

      <div className="my-auto grid gap-1.5">
        {benefits.map((benefit) => (
          <span
            key={benefit.label}
            className="inline-flex min-h-8 w-full items-center gap-2 border-b border-border/25 px-3 py-1.5 text-[12px] font-medium leading-tight text-primary"
          >
            <span className="flex size-5 shrink-0 items-center justify-center text-primary">
              <HugeiconsIcon icon={benefit.icon} size={13} strokeWidth={1.8} />
            </span>
            <span>{benefit.label}</span>
          </span>
        ))}
      </div>

      <button
        type="button"
        className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[8px] bg-primary px-4 text-[15px] font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span>{t('profile.subscriptionUpgradeButton')}</span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />
      </button>
    </section>
  );
}

function PlaceholderPanel({ type }: { type: Exclude<ProfileTabId, 'profile' | 'settings'> }) {
  const { t } = useTranslation();
  const content = {
    progress: {
      icon: ChartColumnIcon,
      titleKey: 'profile.progressEmptyTitle',
      bodyKey: 'profile.progressEmptyBody',
    },
    weakTopics: {
      icon: AlertCircleIcon,
      titleKey: 'profile.weakTopicsEmptyTitle',
      bodyKey: 'profile.weakTopicsEmptyBody',
      actionTo: '/analyze',
      actionLabelKey: 'profile.weakTopicsAnalyzeButton',
    },
    favorites: {
      icon: StarIcon,
      titleKey: 'profile.favoritesEmptyTitle',
      bodyKey: 'profile.favoritesEmptyBody',
    },
  }[type];

  return (
    <section className="px-8 py-12 max-md:px-5">
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[8px] border border-dashed border-border bg-bg px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-surface text-primary">
          <HugeiconsIcon icon={content.icon} size={28} strokeWidth={1.7} />
        </span>
        <h2 className="mt-5 text-[28px] font-medium leading-tight text-text max-md:text-[24px]">
          {t(content.titleKey)}
        </h2>
        <p className="mt-3 max-w-[520px] text-[17px] leading-relaxed text-text-body">
          {t(content.bodyKey)}
        </p>
        {'actionTo' in content && content.actionTo && (
          <Link
            to={content.actionTo}
            className="mt-6 inline-flex h-[44px] items-center justify-center rounded-[8px] bg-primary px-5 text-[15px] font-medium text-surface transition-opacity hover:opacity-90"
          >
            {t(content.actionLabelKey)}
          </Link>
        )}
      </div>
    </section>
  );
}

function WeakTopicsPanel() {
  const { t } = useTranslation();
  const [results, setResults] = useState<AnalyzeChapterResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getLatestAnalyzeResult()
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('common.error')));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const weakTopics = useMemo(
    () => buildWeakTopicInsights(results ?? []),
    [results],
  );

  // TODO backend: expose a stable chapter id and optional weight_note when the API supports them.
  useEffect(() => {
    if (weakTopics.length === 0) {
      setSelectedChapter(null);
      return;
    }

    if (!selectedChapter || !weakTopics.some((topic) => topic.chapter === selectedChapter)) {
      setSelectedChapter(weakTopics[0].chapter);
    }
  }, [selectedChapter, weakTopics]);

  if (loading) {
    return <WeakTopicsLoadingState />;
  }

  if (error) {
    return (
      <section className="px-8 py-12 max-md:px-5">
        <div className="rounded-[8px] border border-danger/35 bg-[#fff5f5] p-5">
          <p className="text-[22px] font-medium leading-tight text-danger">
            {t('profile.weakTopicsErrorTitle')}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-danger">{error}</p>
        </div>
      </section>
    );
  }

  if (!results || weakTopics.length === 0) {
    return <PlaceholderPanel type="weakTopics" />;
  }

  return (
    <section className={WEAK_TOPICS_PANEL_SECTION_CLASS}>
      <WeakTopicsMasterDetail
        selectedChapter={selectedChapter}
        weakTopics={weakTopics}
        onSelectChapter={setSelectedChapter}
      />
    </section>
  );
}

function WeakTopicsLoadingState() {
  const { t } = useTranslation();

  return (
    <section
      className={WEAK_TOPICS_PANEL_SECTION_CLASS}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{t('common.loading')}</span>
      <div aria-hidden="true" className={`${WEAK_TOPICS_MASTER_DETAIL_GRID_CLASS} animate-pulse`}>
        <div className="flex h-full min-h-0 flex-col rounded-[8px] border border-border/30 bg-bg/55 p-3">
          <div>
            <div className="h-3 w-28 rounded-full bg-primary/12" />
            <div className="mt-1.5 h-5 w-16 rounded-[6px] bg-primary/12" />
            <div className="mt-1.5 h-3 w-32 rounded-full bg-border/40" />
          </div>
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pr-2">
            {Array.from({ length: 3 }).map((_, item) => (
              <div
                key={item}
                className="grid grid-cols-[minmax(0,1fr)_46px] items-start gap-2 rounded-[8px] border border-transparent bg-surface/70 px-3 py-2.5 shadow-sm max-md:shadow-none"
              >
                <span className="min-w-0">
                  <span className="block h-4 w-full max-w-[150px] rounded-[6px] bg-primary/12" />
                  {item === 0 && (
                    <span className="mt-1.5 block h-4 w-[118px] rounded-[6px] bg-primary/12" />
                  )}
                  <span className="mt-2 block h-3 w-24 rounded-full bg-border/40" />
                </span>
                <span className="mt-0.5 h-[22px] w-[46px] rounded-[8px] bg-bg" />
              </div>
            ))}
          </div>
        </div>

        <article className="h-full min-h-0 overflow-hidden rounded-[8px] border border-border/35 bg-surface p-4 shadow-[0_14px_34px_rgba(58,28,110,0.08)] max-md:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-3 w-36 rounded-full bg-primary/12" />
              <div className="mt-1 h-8 w-[420px] max-w-full rounded-[8px] bg-primary/12" />
              <div className="mt-1.5 h-8 w-[300px] max-w-[72%] rounded-[8px] bg-primary/12" />
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <div className="h-7 w-24 rounded-full bg-bg" />
                <div className="h-7 w-20 rounded-full bg-bg" />
              </div>
            </div>
            <div className="min-w-[104px] text-right max-sm:w-full max-sm:text-left">
              <div className="ml-auto h-[30px] w-16 rounded-[8px] bg-primary/12 max-sm:ml-0" />
              <div className="mt-1.5 h-1.5 rounded-full bg-bg" />
            </div>
          </div>

          <div className="mt-4 border-t border-border/30 pt-3">
            <div className="rounded-[8px] bg-bg/70 p-2">
              <div className="flex min-h-8 flex-wrap items-center gap-2">
                <div className="h-5 w-52 max-w-full rounded-full bg-primary/12" />
                <div className="size-5 rounded-full bg-primary/12" />
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="size-8 rounded-[8px] border border-border/55 bg-surface" />
                  <div className="h-8 w-36 rounded-[8px] border border-border/55 bg-surface" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 max-md:grid-cols-2 max-sm:grid-cols-1">
                {Array.from({ length: 3 }).map((_, book) => (
                  <div
                    key={book}
                    className="flex min-h-[96px] w-full min-w-0 flex-col gap-1.5 rounded-[8px] border border-border/25 bg-surface px-3 py-3 shadow-sm max-md:shadow-none"
                  >
                    <span className="flex min-w-0 items-start justify-between gap-2">
                      <span className="block h-4 w-28 rounded-[6px] bg-primary/12" />
                      <span className="h-[18px] w-16 shrink-0 rounded-full bg-bg" />
                    </span>
                    <span className="mt-3 min-w-0">
                      <span className="flex items-center justify-between gap-3">
                        <span className="h-3 w-16 rounded-full bg-primary/12" />
                        <span className="h-3 w-8 rounded-full bg-primary/12" />
                      </span>
                      <span className="mt-1.5 block h-1.5 rounded-full bg-bg" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function WeakTopicsMasterDetail({
  weakTopics,
  selectedChapter,
  onSelectChapter,
}: {
  weakTopics: WeakTopicInsight[];
  selectedChapter: string | null;
  onSelectChapter: (chapter: string) => void;
}) {
  const selectedTopic =
    weakTopics.find((topic) => topic.chapter === selectedChapter) ?? weakTopics[0];

  return (
    <div className={WEAK_TOPICS_MASTER_DETAIL_GRID_CLASS}>
      <WeakTopicList
        selectedChapter={selectedTopic.chapter}
        weakTopics={weakTopics}
        onSelectChapter={onSelectChapter}
      />
      <WeakTopicDetail key={selectedTopic.chapter} topic={selectedTopic} />
    </div>
  );
}

function WeakTopicList({
  weakTopics,
  selectedChapter,
  onSelectChapter,
}: {
  weakTopics: WeakTopicInsight[];
  selectedChapter: string;
  onSelectChapter: (chapter: string) => void;
}) {
  const { t } = useTranslation();
  const lostPoints = weakTopics.reduce((sum, topic) => sum + topic.lostPoints, 0);

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-[8px] border border-border/30 bg-bg/55 p-3">
      <div>
        <p className="text-[12px] font-medium uppercase leading-none tracking-[0.1em] text-muted">
          {t('profile.weakTopicsListEyebrow')}
        </p>
        <h2 className="mt-1.5 text-[17px] font-medium leading-tight text-text">
          {t('profile.weakTopicsListTitle')}
        </h2>
        <p className="mt-1.5 text-[12px] leading-4 text-muted">
          {t('profile.weakTopicsLostPointsInline', {
            count: lostPoints,
          })}
        </p>
      </div>

      <div
        className="weak-topic-list-scroll mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-2"
        role="listbox"
        aria-label={t('profile.weakTopicsListAriaLabel')}
      >
        {weakTopics.map((topic) => {
          const status = getScoreStatus(topic.percentage);
          const chapterLabel = getAnalyzeChapterLabel(topic.chapter, t);
          const isSelected = selectedChapter === topic.chapter;

          return (
            <button
              key={topic.chapter}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelectChapter(topic.chapter)}
              className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-[8px] border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-md:shadow-none ${
                isSelected
                  ? 'border-primary/35 bg-surface shadow-sm'
                  : 'border-transparent bg-surface/70 hover:border-border/55 hover:bg-surface'
              }`}
              aria-label={t('profile.weakTopicsListItemLabel', {
                chapter: chapterLabel,
                percent: topic.percentage,
              })}
            >
              <span className="min-w-0 flex-1">
                <span className="block min-w-0 break-words text-[14px] font-medium leading-[1.16] text-text">
                  {chapterLabel}
                </span>
                <span className="mt-1 block truncate text-[12px] leading-none text-muted">
                  {t('profile.weakTopicsLostPointsInline', {
                    count: topic.lostPoints,
                  })}
                </span>
              </span>
              <span
                className={`mt-0.5 inline-flex min-w-[46px] shrink-0 justify-center rounded-[8px] bg-bg px-1.5 py-1 text-[14px] font-medium leading-none tabular-nums ${status.textClass}`}
              >
                {topic.percentage}%
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function WeakTopicDetail({ topic }: { topic: WeakTopicInsight }) {
  const { t } = useTranslation();
  const status = getScoreStatus(topic.percentage);
  const progress = clampScorePercent(topic.percentage);
  const chapterLabel = getAnalyzeChapterLabel(topic.chapter, t);

  return (
    <article
      className="h-full min-h-0 overflow-hidden rounded-[8px] border border-border/35 bg-surface p-4 shadow-[0_14px_34px_rgba(58,28,110,0.08)] max-md:shadow-none"
      aria-live="polite"
      aria-label={t('profile.weakTopicsDetailLabel', { chapter: chapterLabel })}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium uppercase leading-none tracking-[0.1em] text-muted">
            {t('profile.weakTopicsSelectedLabel')}
          </p>
          <h3 className="mt-1 break-words text-[22px] font-medium leading-snug text-text max-md:text-[20px]">
            {chapterLabel}
          </h3>
          <WeakTopicStatsRow topic={topic} />
        </div>
        <WeakTopicResultIndicator
          percentage={topic.percentage}
          progress={progress}
          status={status}
        />
      </div>

      <div className="mt-4 border-t border-border/30 pt-3">
        <WeakTopicBookList books={topic.books} />
      </div>
    </article>
  );
}

function WeakTopicResultIndicator({
  percentage,
  progress,
  status,
}: {
  percentage: number;
  progress: number;
  status: ScoreStatus;
}) {
  return (
    <div className="min-w-[104px] text-right max-sm:w-full max-sm:text-left">
      <span className={`text-[30px] font-medium leading-none ${status.textClass}`}>
        {percentage}%
      </span>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg" aria-hidden>
        <div
          className={`h-full rounded-full ${status.progressClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function WeakTopicStatsRow({ topic }: { topic: WeakTopicInsight }) {
  const { t } = useTranslation();
  const weightedQuestionCount = Math.max(0, topic.max_score - topic.question_count);

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      <span className="inline-flex h-7 items-center rounded-full bg-bg px-2.5 text-[12px] font-medium leading-none text-primary">
        {t('profile.weakTopicsScoreInline', {
          score: topic.score,
          maxScore: topic.max_score,
        })}
      </span>
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-bg px-2.5 text-[12px] font-medium leading-none text-primary">
        {t('profile.weakTopicsQuestionCount', {
          count: topic.question_count,
        })}
      </span>
      {weightedQuestionCount > 0 && (
        <WeakTopicInfoTooltip
          label={t('profile.weakTopicsWeightedScoreLabel', {
            count: weightedQuestionCount,
          })}
          text={t('profile.weakTopicsWeightedScoreTooltip', {
            count: weightedQuestionCount,
          })}
        />
      )}
    </div>
  );
}

function WeakTopicBookList({
  books,
}: {
  books: AnalyzeBookCoverage[];
}) {
  const { t } = useTranslation();
  const [bookWindowStart, setBookWindowStart] = useState(0);
  const maxWindowStart = Math.max(0, books.length - INITIAL_VISIBLE_BOOKS_LIMIT);
  const normalizedWindowStart = Math.min(bookWindowStart, maxWindowStart);
  const visibleBooks = books.slice(
    normalizedWindowStart,
    normalizedWindowStart + INITIAL_VISIBLE_BOOKS_LIMIT,
  );
  const hasBookNavigation = books.length > INITIAL_VISIBLE_BOOKS_LIMIT;
  const canShowPreviousBooks = normalizedWindowStart > 0;
  const canShowNextBooks =
    normalizedWindowStart + INITIAL_VISIBLE_BOOKS_LIMIT < books.length;
  const remainingBookCount = Math.max(
    0,
    books.length - normalizedWindowStart - INITIAL_VISIBLE_BOOKS_LIMIT,
  );

  useEffect(() => {
    setBookWindowStart(0);
  }, [books]);

  function showPreviousBooks() {
    setBookWindowStart((value) => Math.max(0, value - INITIAL_VISIBLE_BOOKS_LIMIT));
  }

  function showNextBooks() {
    setBookWindowStart((value) =>
      Math.min(maxWindowStart, value + INITIAL_VISIBLE_BOOKS_LIMIT),
    );
  }

  if (books.length === 0) {
    return (
      <p className="rounded-[8px] bg-bg px-4 py-3 text-[14px] leading-6 text-muted">
        {t('profile.weakTopicsNoBooks')}
      </p>
    );
  }

  return (
    <div className="rounded-[8px] bg-bg/70 p-2">
      <div className="flex min-h-8 flex-wrap items-center gap-2">
        <span className="inline-flex min-w-0 items-center gap-1">
          <p className="truncate text-[15px] font-medium leading-tight text-primary">
            {t('profile.weakTopicsBooksTitle')}
          </p>
          <WeakTopicInfoTooltip text={t('profile.weakTopicsBooksInfoTooltip')} />
        </span>

        {hasBookNavigation && (
          <div className="ml-auto inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={showPreviousBooks}
              disabled={!canShowPreviousBooks}
              aria-label={t('profile.weakTopicsPreviousBooks')}
              className="inline-flex size-8 items-center justify-center rounded-[8px] border border-border/55 bg-surface text-primary transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:text-muted/45 disabled:opacity-55"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={showNextBooks}
              disabled={!canShowNextBooks}
              aria-label={t('profile.weakTopicsNextBooks')}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-border/55 bg-surface px-2.5 text-[12px] font-medium leading-none text-primary transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:text-muted/45 disabled:opacity-55"
            >
              <span className="max-sm:sr-only">
                {remainingBookCount > 0
                  ? t('profile.weakTopicsShowMoreBooks', { count: remainingBookCount })
                  : t('profile.weakTopicsNextBooks')}
              </span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>

      <ol
        className="mt-4 grid grid-cols-3 gap-2 max-md:grid-cols-2 max-sm:grid-cols-1"
        aria-label={t('profile.weakTopicsSecondaryBooksLabel')}
      >
        {visibleBooks.map((book) => (
          <li key={book.public_id} className="min-w-0">
            <WeakTopicBookRow book={book} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function WeakTopicBookRow({
  book,
}: {
  book: AnalyzeBookCoverage;
}) {
  const { t } = useTranslation();
  const coverage = clampScorePercent(book.percentage);

  return (
    <div className="flex min-h-[96px] w-full min-w-0 flex-col gap-1.5 rounded-[8px] border border-border/25 bg-surface px-3 py-3 shadow-sm max-md:shadow-none">
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="line-clamp-2 block min-w-0 break-words text-[14px] font-medium leading-tight text-text">
          {book.publisher}
        </span>
        <span className="shrink-0 rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium leading-none text-muted">
          {t('analyze.bookGradeSuperscript', { grade: book.grade })}
        </span>
      </span>

      <span className="mt-3 min-w-0">
        <span
          className="flex items-center justify-between gap-3 text-[12px] font-medium leading-none text-primary"
          aria-label={t('profile.weakTopicsBookCoverageTooltip', {
            percent: book.percentage,
          })}
        >
          <span>{t('profile.weakTopicsBookCoverageLabel')}</span>
          <span>{book.percentage}%</span>
        </span>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-bg" aria-hidden>
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${coverage}%` }}
          />
        </span>
      </span>
    </div>
  );
}

function WeakTopicInfoTooltip({
  text,
  label,
}: {
  text: string;
  label?: string;
}) {
  const tooltipId = useId();

  return (
    <span className="relative inline-flex shrink-0 items-center">
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-label={text}
        className={`group inline-flex items-center justify-center gap-1 text-[12px] font-medium leading-none text-muted transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          label
            ? 'h-7 rounded-full bg-bg px-2.5 hover:bg-primary/5'
            : 'h-5 w-5 rounded-none bg-transparent p-0 hover:bg-transparent'
        }`}
      >
        {label && <span>{label}</span>}
        <HugeiconsIcon icon={HelpCircleIcon} size={14} strokeWidth={1.8} />
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 w-[300px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-[8px] bg-surface px-3 py-2.5 text-left text-[12px] font-normal leading-5 text-text-body opacity-0 shadow-[0_14px_34px_rgba(58,28,110,0.16)] transition duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 max-md:shadow-none"
        >
          <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-surface" />
          {text}
        </span>
      </button>
    </span>
  );
}

function getAnalyzeChapterLabel(chapter: string, t: (key: string, values?: Record<string, unknown>) => string) {
  const key = `analyze.chapters.${chapter}`;
  const translated = t(key);
  return translated === key ? chapter : translated;
}

type SettingsView = 'menu' | 'password' | 'email' | 'language' | 'delete';

function SettingsPanel({ profile }: { profile: User }) {
  const { t } = useTranslation();
  const [view, setView] = useState<SettingsView>('menu');

  if (view === 'password') {
    return (
      <SettingsDetail
        title={t('profile.changePasswordTitle')}
        body={t('profile.changePasswordBody')}
        onBack={() => setView('menu')}
      >
        <ChangePasswordFlow />
      </SettingsDetail>
    );
  }

  if (view === 'email') {
    return (
      <SettingsDetail
        title={t('profile.boundEmailTitle')}
        body={t('profile.boundEmailBody')}
        onBack={() => setView('menu')}
      >
        <ProfileField label={t('profile.boundEmailLabel')} value={profile.email} />
      </SettingsDetail>
    );
  }

  if (view === 'language') {
    return (
      <SettingsDetail
        title={t('profile.languagePref')}
        body={t('profile.settingsLanguageBody')}
        onBack={() => setView('menu')}
      >
        <LanguageSettingsPanel />
      </SettingsDetail>
    );
  }

  if (view === 'delete') {
    return (
      <SettingsDetail
        title={t('profile.deleteAccountTitle')}
        body={t('profile.deleteAccountBody')}
        onBack={() => setView('menu')}
      >
        <DeleteAccountPanel userId={profile.id} />
      </SettingsDetail>
    );
  }

  return (
    <section className="px-8 py-12 max-md:px-5">
      <div className="min-h-[320px] space-y-3">
        <SettingsActionButton
          icon={LockPasswordIcon}
          title={t('profile.settingsPasswordTitle')}
          body={t('profile.settingsPasswordBody')}
          onClick={() => setView('password')}
        />
        <SettingsActionButton
          icon={Mail01Icon}
          title={t('profile.settingsEmailTitle')}
          body={t('profile.settingsEmailBody')}
          onClick={() => setView('email')}
        />
        <SettingsActionButton
          icon={Settings01Icon}
          title={t('profile.settingsLanguageTitle')}
          body={t('profile.settingsLanguageBody')}
          onClick={() => setView('language')}
        />
        <SettingsActionButton
          icon={Delete02Icon}
          title={t('profile.settingsDeleteTitle')}
          body={t('profile.settingsDeleteBody')}
          tone="danger"
          onClick={() => setView('delete')}
        />
      </div>
    </section>
  );
}

function LanguageSettingsPanel() {
  const { t } = useTranslation();
  const lang = useLangStore((state) => state.lang);
  const setLang = useLangStore((state) => state.setLang);
  const options: Array<{ value: Language; label: string }> = [
    { value: 'ru', label: t('profile.languageRussian') },
    { value: 'kk', label: t('profile.languageKazakh') },
  ];

  return (
    <div className="grid gap-2">
      {options.map((option) => {
        const selected = lang === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLang(option.value)}
            className={`flex min-h-[52px] items-center justify-between gap-3 rounded-[8px] border px-4 text-left text-[16px] font-medium transition-colors ${
              selected
                ? 'border-primary/45 bg-bg text-primary'
                : 'border-border/65 bg-surface text-text-body hover:bg-bg'
            }`}
            aria-pressed={selected}
          >
            <span>{option.label}</span>
            {selected && (
              <HugeiconsIcon icon={Tick02Icon} size={20} strokeWidth={2} className="text-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function SettingsActionButton({
  icon,
  title,
  body,
  tone = 'default',
  onClick,
}: {
  icon: typeof Profile02Icon;
  title: string;
  body: string;
  tone?: 'default' | 'danger';
  onClick: () => void;
}) {
  const isDanger = tone === 'danger';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[84px] w-full items-center justify-between gap-5 rounded-[8px] border px-5 py-4 text-left transition-colors ${
        isDanger
          ? 'border-danger/35 bg-surface hover:bg-[#fff5f5]'
          : 'border-border/65 bg-surface hover:bg-bg'
      }`}
    >
      <span className="flex min-w-0 items-center gap-4">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-[8px] ${
            isDanger ? 'bg-danger/10 text-danger' : 'bg-bg text-primary'
          }`}
        >
          <HugeiconsIcon icon={icon} size={23} strokeWidth={1.7} />
        </span>
        <span className="min-w-0">
          <span
            className={`block text-[18px] font-medium leading-tight ${
              isDanger ? 'text-danger' : 'text-primary'
            }`}
          >
            {title}
          </span>
          <span className="mt-1 block text-[14px] leading-snug text-text-body">{body}</span>
        </span>
      </span>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        size={20}
        strokeWidth={1.8}
        className={isDanger ? 'shrink-0 text-danger' : 'shrink-0 text-muted'}
      />
    </button>
  );
}

function SettingsDetail({
  title,
  body,
  onBack,
  children,
}: {
  title: string;
  body: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <section className="px-8 py-12 max-md:px-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex h-[40px] items-center gap-2 rounded-[8px] border border-border/65 px-4 text-[15px] text-primary transition-colors hover:bg-bg"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.8} />
        <span>{t('profile.settingsBackButton')}</span>
      </button>

      <div className="rounded-[8px] border border-border/65 p-5">
        <p className="text-[22px] font-medium leading-tight text-primary">{title}</p>
        <p className="mt-2 text-[16px] leading-relaxed text-text-body">{body}</p>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

type ChangePasswordFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

function ChangePasswordFlow() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'current' | 'new'>('current');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ChangePasswordFieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleCurrentPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setError(null);
    setFieldErrors({});

    if (!currentPassword) {
      setFieldErrors({ currentPassword: t('auth.passwordRequired') });
      return;
    }

    setStep('new');
  }

  async function handleNewPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setError(null);
    setFieldErrors({});

    const nextErrors: ChangePasswordFieldErrors = {
      newPassword: getPasswordValidationError(newPassword, t),
    };
    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = t('auth.passwordsDontMatch');
    }

    if (nextErrors.newPassword || nextErrors.confirmPassword) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      setNotice(t('profile.changePasswordSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('current');
    } catch (err) {
      setError(getApiErrorMessage(err, t('profile.changePasswordFailed')));
    } finally {
      setLoading(false);
    }
  }

  if (step === 'current') {
    return (
      <form onSubmit={handleCurrentPasswordSubmit} noValidate>
        <AuthPasswordInput
          label={t('profile.currentPassword')}
          value={currentPassword}
          visible={showCurrentPassword}
          onChange={(value) => {
            setCurrentPassword(value);
            setFieldErrors((errors) => ({ ...errors, currentPassword: undefined }));
            setError(null);
            setNotice(null);
          }}
          onToggle={() => setShowCurrentPassword((visible) => !visible)}
          toggleLabel={showCurrentPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          autoComplete="current-password"
          error={fieldErrors.currentPassword}
        />
        {notice && (
          <p className="mb-3 rounded-[8px] bg-success/10 px-3 py-2 text-[14px] text-success" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="mb-3 text-[14px] text-danger" role="alert">
            {error}
          </p>
        )}
        <AuthSubmit>{t('profile.changePasswordContinueButton')}</AuthSubmit>
      </form>
    );
  }

  return (
    <form onSubmit={handleNewPasswordSubmit} noValidate>
      <div>
        <AuthPasswordInput
          label={t('auth.newPassword')}
          value={newPassword}
          visible={showNewPassword}
          onChange={(value) => {
            setNewPassword(value);
            setFieldErrors((errors) => ({ ...errors, newPassword: undefined }));
            setError(null);
            setNotice(null);
          }}
          onToggle={() => setShowNewPassword((visible) => !visible)}
          toggleLabel={showNewPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          autoComplete="new-password"
          error={fieldErrors.newPassword}
        />
        <AuthPasswordInput
          label={t('auth.confirmPassword')}
          value={confirmPassword}
          visible={showConfirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
            setFieldErrors((errors) => ({ ...errors, confirmPassword: undefined }));
            setError(null);
            setNotice(null);
          }}
          onToggle={() => setShowConfirmPassword((visible) => !visible)}
          toggleLabel={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />
      </div>
      {error && (
        <p className="mb-3 text-[14px] text-danger" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setStep('current');
          setError(null);
          setNotice(null);
          setFieldErrors({});
        }}
        className="mb-3 inline-flex h-[40px] items-center justify-center rounded-[8px] px-2 text-[15px] text-primary transition-colors hover:bg-bg"
      >
        {t('profile.changePasswordEditCurrentButton')}
      </button>
      <AuthSubmit loading={loading}>
        {loading ? t('common.loading') : t('profile.changePasswordButton')}
      </AuthSubmit>
    </form>
  );
}

function DeleteAccountPanel({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDeleteAccount() {
    setError(null);
    setLoading(true);
    try {
      await deleteMyAccount(userId);
      logout();
      navigate('/login');
    } catch (err) {
      setError(getApiErrorMessage(err, t('profile.deleteAccountFailed')));
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="rounded-[8px] bg-[#fff5f5] px-4 py-3 text-[15px] leading-relaxed text-danger">
        {t('profile.deleteAccountWarning')}
      </div>
      {error && (
        <p className="mt-3 text-[14px] text-danger" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleDeleteAccount}
        disabled={loading}
        className="mt-5 inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-[8px] bg-danger px-4 text-[15px] font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.8} />
        <span>{loading ? t('common.loading') : t('profile.deleteAccountButton')}</span>
      </button>
    </div>
  );
}

function getApiErrorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err) || !err.response?.data) return fallback;

  const detail = (err.response.data as { detail?: unknown }).detail;
  return typeof detail === 'string' ? detail : fallback;
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[92px] flex-col justify-center rounded-[8px] bg-bg px-5 py-4">
      <span className="text-[14px] leading-none text-muted">{label}</span>
      <span className="mt-3 break-all text-[20px] leading-tight text-primary max-sm:text-[17px]">
        {value}
      </span>
    </div>
  );
}

function getTabTitle(tab: ProfileTabId, t: (key: string) => string) {
  const titleKeys: Record<ProfileTabId, string> = {
    profile: 'profile.navProfile',
    progress: 'profile.navProgress',
    weakTopics: 'profile.navWeakTopics',
    favorites: 'profile.navFavorites',
    settings: 'profile.navSettings',
  };

  return t(titleKeys[tab]);
}
