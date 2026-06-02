import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ChartColumnIcon,
  Delete02Icon,
  LockPasswordIcon,
  Logout01Icon,
  Mail01Icon,
  Profile02Icon,
  Settings01Icon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { useAuthStore } from '../stores/authStore';
import { changeMyPassword, deleteMyAccount, getMe } from '../api/users';
import type { User } from '../types';
import { FigmaProfileIcon } from '../components/FigmaIcons';
import { SkeletonCard } from '../components/SkeletonCard';
import { AuthPasswordInput, AuthSubmit } from '../components/AuthShell';
import { getPasswordValidationError } from '../utils/passwordValidation';

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
                  className={`group flex h-[54px] w-full items-center gap-3 rounded-[8px] border px-5 text-left text-[18px] text-primary transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-0 ${
                    isActive
                      ? 'border-border bg-surface shadow-[2px_2px_0_#9683b7] hover:shadow-[3px_3px_0_#9683b7]'
                      : 'border-transparent hover:border-border hover:bg-surface hover:shadow-[2px_2px_0_#9683b7]'
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
              <header className="border-b border-border/55 px-7 py-5 max-md:px-5">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-[14px] font-medium uppercase leading-none tracking-[0.12em] text-muted">
                      {t('profile.accountArea')}
                    </p>
                    <h1 className="mt-2 text-[38px] font-medium leading-tight text-text max-md:text-[32px]">
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

              {activeTab === 'profile' && <ProfileOverview profile={profile} />}
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
}: {
  profile: User;
}) {
  const { t } = useTranslation();

  return (
    <div className="px-8 py-12 max-md:px-5">
      <section className="grid min-h-[320px] grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] items-start gap-6 max-xl:grid-cols-1">
        <div className="rounded-[8px] bg-bg p-6">
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
  const { t } = useTranslation();

  return (
    <section className="self-start rounded-[8px] border border-border/65 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium uppercase leading-none tracking-[0.12em] text-muted">
            {t('profile.subscriptionEyebrow')}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-bg px-3 py-1 text-[13px] font-medium leading-none text-primary">
          {t('profile.subscriptionBadge')}
        </span>
      </div>

      <h2 className="mt-3 text-[24px] font-medium leading-tight text-primary">
        {t('profile.subscriptionTitle')}
      </h2>

      <p className="mt-3 text-[14px] leading-snug text-text-body">
        {t('profile.subscriptionBody')}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-bg px-3 py-1 text-[13px] leading-none text-primary">
          {t('profile.subscriptionBenefitWeakTopics')}
        </span>
        <span className="rounded-full bg-bg px-3 py-1 text-[13px] leading-none text-primary">
          {t('profile.subscriptionBenefitRecommendations')}
        </span>
      </div>

      <button
        type="button"
        className="mt-5 inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[8px] bg-accent px-4 text-[15px] font-medium text-surface transition-opacity hover:opacity-90"
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

type SettingsView = 'menu' | 'password' | 'email' | 'delete';

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
