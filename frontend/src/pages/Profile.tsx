import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Logout01Icon } from '@hugeicons/core-free-icons';
import { useAuthStore } from '../stores/authStore';
import { useLangStore } from '../stores/langStore';
import { getMe } from '../api/users';
import type { User, UserGrade } from '../types';
import { SkeletonCard } from '../components/SkeletonCard';

function gradeLabel(grade: UserGrade, t: (k: string) => string): string {
  switch (grade) {
    case '10':
      return t('profile.grade10');
    case '11':
      return t('profile.grade11');
    default:
      return t('profile.gradeUndefined');
  }
}

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const [profile, setProfile] = useState<User | null>(user);
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setUser(data);
        }
      })
      .catch(() => undefined)
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
    <div className="mx-auto max-w-[700px] px-6 py-12">
      <h1 className="font-medium text-[36px] text-text mb-8 max-md:text-[26px]">
        {t('profile.title')}
      </h1>

      {loading && !profile && <SkeletonCard />}

      {profile && (
        <div className="bg-surface border border-border rounded-[15px] p-10 shadow-feature flex flex-col gap-6 max-md:p-6">
          <Field label={t('profile.username')} value={profile.username} />
          <Field label={t('profile.email')} value={profile.email} />
          <Field label={t('profile.grade')} value={gradeLabel(profile.grade, t)} />

          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-muted uppercase tracking-wider">
              {t('profile.languagePref')}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLang('ru')}
                className={`px-4 py-2 rounded-[10px] border text-[15px] transition-colors ${
                  lang === 'ru'
                    ? 'bg-accent text-surface border-accent'
                    : 'border-border text-text-body hover:border-accent'
                }`}
              >
                {t('common.russian')}
              </button>
              <button
                type="button"
                onClick={() => setLang('kk')}
                className={`px-4 py-2 rounded-[10px] border text-[15px] transition-colors ${
                  lang === 'kk'
                    ? 'bg-accent text-surface border-accent'
                    : 'border-border text-text-body hover:border-accent'
                }`}
              >
                {t('common.kazakh')}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="self-start mt-2 inline-flex items-center gap-2 bg-primary text-surface rounded-[10px] px-5 py-3 text-[16px] hover:opacity-90 transition-opacity"
          >
            <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={1.7} />
            {t('profile.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] text-muted uppercase tracking-wider">{label}</span>
      <span className="text-[18px] text-text">{value}</span>
    </div>
  );
}
