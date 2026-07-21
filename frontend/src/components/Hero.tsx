import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { SearchChoiceModal } from './SearchChoiceModal';
import { Button } from '../ui';

function authTarget(path: string, isAuthenticated: boolean): string {
  if (isAuthenticated) return path;
  return `/login?next=${encodeURIComponent(path)}`;
}

export function Hero() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  return (
    <>
      <section className="w-full bg-bg px-6 pb-[72px] pt-14">
        <div className="mx-auto flex max-w-[970px] flex-col items-center gap-7 text-center">
          <h1 className="text-[40px] font-medium leading-none text-text max-md:text-[32px]">
            {t('landing.heroTitle')}
          </h1>
          <p className="max-w-[860px] text-[20px] leading-none text-text-body max-md:text-[16px]">
            {t('landing.heroSubtitle')}
          </p>
          <Button
            size="lg"
            className="px-[45px] py-[16px] text-[20px]"
            onClick={() => setSearchModalOpen(true)}
          >
            <span>{t('landing.ctaFind')} </span>
            <span className="text-highlight">{t('landing.ctaTerm')}</span>
            <span> {t('landing.ctaOr')} </span>
            <span className="text-highlight">{t('landing.ctaDefinition')}</span>
          </Button>
        </div>
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
