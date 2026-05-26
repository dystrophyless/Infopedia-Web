import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AlertCircleIcon,
  ChartColumnIcon,
  Logout01Icon,
  Profile02Icon,
  Settings01Icon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { useAuthStore } from '../stores/authStore';
import { getMe } from '../api/users';
import type { User, UserGrade, UserLanguage } from '../types';
import { FigmaProfileIcon } from '../components/FigmaIcons';
import { SkeletonCard } from '../components/SkeletonCard';

export const profileDetailFieldKeys = [
  'username',
  'email',
  'grade',
  'languagePref',
  'memberSince',
] as const;

type ProfileDetailFieldKey = (typeof profileDetailFieldKeys)[number];
type ProfileTabId = 'profile' | 'progress' | 'weakTopics' | 'favorites' | 'settings';

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
  const { t, i18n } = useTranslation();
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
  }, [setUser]);

  const profileDetails = useMemo(() => {
    if (!profile) return [];

    const detailValues: Record<ProfileDetailFieldKey, string> = {
      username: profile.username ?? t('profile.usernameUndefined'),
      email: profile.email,
      grade: getGradeLabel(profile.grade, t),
      languagePref: getLanguageLabel(profile.language, t),
      memberSince: formatMemberSince(profile.created_at, i18n.language, t),
    };

    return profileDetailFieldKeys.map((fieldKey) => ({
      key: fieldKey,
      label: t(`profile.${fieldKey}`),
      value: detailValues[fieldKey],
    }));
  }, [i18n.language, profile, t]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-bg px-6 pb-16 pt-14 max-md:px-4 max-md:pt-8">
      <div className="mx-auto grid max-w-[1280px] grid-cols-[360px_minmax(0,1fr)] gap-8 max-lg:grid-cols-1">
        <aside
          className="max-lg:mx-auto max-lg:w-full max-lg:max-w-[860px]"
          aria-label={t('profile.title')}
        >
          <section className="rounded-[8px] border border-border bg-surface p-5 shadow-[3px_3px_0_#9683b7]">
            <div className="flex items-center gap-4">
              <FigmaProfileIcon className="block size-[70px] shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="truncate text-[28px] font-medium leading-tight text-primary max-sm:text-[23px]">
                  {profile?.username ?? user?.username ?? t('profile.usernameUndefined')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ProfileChip>{profile ? getGradeLabel(profile.grade, t) : t('profile.fallbackProfileChip')}</ProfileChip>
                  <ProfileChip>{profile ? getLanguageLabel(profile.language, t) : t('profile.languageRussian')}</ProfileChip>
                </div>
              </div>
            </div>
          </section>

          <nav className="mt-5 flex flex-col gap-3 max-lg:grid max-lg:grid-cols-2 max-sm:grid-cols-1">
            {profileNavItems.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex h-[54px] w-full items-center gap-3 rounded-[8px] border px-5 text-left text-[18px] text-primary transition-colors ${
                    isActive
                      ? 'border-border bg-surface shadow-[2px_2px_0_#9683b7]'
                      : 'border-transparent hover:border-border/60 hover:bg-surface/60'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <HugeiconsIcon icon={item.icon} size={22} strokeWidth={1.7} />
                  <span className="truncate">{t(item.labelKey)}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="rounded-[8px] border border-border bg-surface shadow-[4px_4px_0_#9683b7] max-lg:mx-auto max-lg:w-full max-lg:max-w-[860px]">
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
              <header className="border-b border-border/55 px-8 py-7 max-md:px-5">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-[14px] font-medium uppercase leading-none tracking-[0.12em] text-muted">
                      {t('profile.accountArea')}
                    </p>
                    <h1 className="mt-3 text-[42px] font-medium leading-tight text-text max-md:text-[32px]">
                      {getTabTitle(activeTab, t)}
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-[46px] items-center justify-center gap-3 rounded-[8px] bg-accent px-5 text-[17px] text-surface transition-opacity hover:opacity-90 max-sm:w-full"
                  >
                    <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={1.7} />
                    {t('profile.logout')}
                  </button>
                </div>
              </header>

              {activeTab === 'profile' && (
                <ProfileOverview profile={profile} details={profileDetails} />
              )}
              {activeTab === 'progress' && <PlaceholderPanel type="progress" />}
              {activeTab === 'weakTopics' && <PlaceholderPanel type="weakTopics" />}
              {activeTab === 'favorites' && <PlaceholderPanel type="favorites" />}
              {activeTab === 'settings' && <SettingsPanel profile={profile} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function ProfileOverview({
  profile,
  details,
}: {
  profile: User;
  details: Array<{ key: ProfileDetailFieldKey; label: string; value: string }>;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 px-8 py-8 max-md:px-5">
      <section className="grid grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] gap-6 max-xl:grid-cols-1">
        <div className="rounded-[8px] bg-bg p-6">
          <div className="flex flex-wrap items-center gap-4">
            <FigmaProfileIcon className="block size-[86px] shrink-0 text-accent" />
            <div className="min-w-0">
              <h2 className="truncate text-[34px] font-medium leading-tight text-primary max-md:text-[27px]">
                {profile.username ?? t('profile.usernameUndefined')}
              </h2>
              <p className="mt-2 break-all text-[18px] leading-tight text-text-body">
                {profile.email}
              </p>
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

        <div className="rounded-[8px] border border-border/65 p-6">
          <p className="text-[18px] font-medium leading-tight text-primary">{t('profile.academicProfile')}</p>
          <div className="mt-5 space-y-4">
            <MetaRow label={t('profile.status')} value={profile.banned ? t('profile.statusBanned') : t('profile.statusActive')} />
            <MetaRow label={t('profile.role')} value={getRoleLabel(profile.role, t)} />
            <MetaRow label="ID" value={`#${profile.id}`} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[24px] font-medium leading-tight text-text">{t('profile.accountData')}</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {details.map((field) => (
            <ProfileField key={field.key} label={field.label} value={field.value} />
          ))}
        </div>
      </section>
    </div>
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
      </div>
    </section>
  );
}

function SettingsPanel({ profile }: { profile: User }) {
  const { t } = useTranslation();

  return (
    <section className="space-y-5 px-8 py-8 max-md:px-5">
      <ProfileField label={t('profile.languagePref')} value={getLanguageLabel(profile.language, t)} />
      <ProfileField label={t('profile.grade')} value={getGradeLabel(profile.grade, t)} />
      <div className="rounded-[8px] border border-border/65 p-5">
        <p className="text-[18px] font-medium leading-tight text-primary">{t('profile.settingsTitle')}</p>
        <p className="mt-2 text-[16px] leading-relaxed text-text-body">
          {t('profile.settingsBody')}
        </p>
      </div>
    </section>
  );
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

function ProfileChip({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-border/65 bg-bg px-3 py-1 text-[13px] leading-none text-primary">
      {children}
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/35 pb-3 last:border-b-0 last:pb-0">
      <span className="text-[15px] text-muted">{label}</span>
      <span className="text-right text-[16px] font-medium text-primary">{value}</span>
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

function getGradeLabel(grade: UserGrade | null, t: (key: string) => string) {
  if (grade === '10') return t('profile.grade10');
  if (grade === '11') return t('profile.grade11');
  return t('profile.gradeUndefined');
}

function getLanguageLabel(language: UserLanguage, t: (key: string) => string) {
  return language === 'kk' ? t('profile.languageKazakh') : t('profile.languageRussian');
}

function getRoleLabel(role: User['role'], t: (key: string) => string) {
  if (role === 'admin') return t('profile.roleAdmin');
  return t('profile.roleStudent');
}

function formatMemberSince(date: string | undefined, locale: string, t: (key: string) => string) {
  if (!date) return t('profile.memberSinceUndefined');

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return t('profile.memberSinceUndefined');

  return new Intl.DateTimeFormat(locale === 'kk' ? 'kk-KZ' : 'ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
}
