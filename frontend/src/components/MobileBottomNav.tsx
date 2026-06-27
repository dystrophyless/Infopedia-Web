import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ChartColumnIcon,
  Home01Icon,
  Profile02Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { useAuthStore } from '../stores/authStore';
import { SearchChoiceModal } from './SearchChoiceModal';

const SEARCH_NAV_PATHS = new Set(['/search', '/semantic-search']);

function authTarget(path: string, isAuthenticated: boolean): string {
  if (isAuthenticated) return path;
  return `/login?next=${encodeURIComponent(path)}`;
}

export function MobileBottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const searchIsActive = SEARCH_NAV_PATHS.has(location.pathname);

  const itemClass =
    'flex min-w-0 flex-col items-center justify-center gap-1 rounded-[12px] px-1 py-1 text-[11px] font-medium leading-none transition-colors';
  const inactiveClass = 'text-muted hover:text-primary';
  const activeClass = 'text-primary';

  return (
    <>
      <nav
        aria-label={t('nav.mobilePrimary')}
        className="fixed inset-x-0 bottom-0 z-40 bg-surface border-0 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-none max-md:shadow-none md:hidden"
      >
        <div className="grid h-[64px] grid-cols-4 gap-1">
          <Link
            to="/"
            className={`${itemClass} ${
              location.pathname === '/' ? activeClass : inactiveClass
            }`}
            aria-current={location.pathname === '/' ? 'page' : undefined}
          >
            <HugeiconsIcon icon={Home01Icon} size={23} strokeWidth={1.8} />
            <span>{t('nav.home')}</span>
          </Link>

          <button
            type="button"
            className={`${itemClass} border-0 bg-transparent ${
              searchIsActive ? activeClass : inactiveClass
            }`}
            aria-current={searchIsActive ? 'page' : undefined}
            onClick={() => setSearchModalOpen(true)}
          >
            <HugeiconsIcon icon={Search01Icon} size={23} strokeWidth={1.8} />
            <span>{t('nav.search')}</span>
          </button>

          <Link
            to="/analyze"
            className={`${itemClass} ${
              location.pathname === '/analyze' ? activeClass : inactiveClass
            }`}
            aria-current={location.pathname === '/analyze' ? 'page' : undefined}
          >
            <HugeiconsIcon icon={ChartColumnIcon} size={23} strokeWidth={1.8} />
            <span>{t('nav.mobileAnalyze')}</span>
          </Link>

          <Link
            to="/profile"
            className={`${itemClass} ${
              location.pathname === '/profile' ? activeClass : inactiveClass
            }`}
            aria-current={location.pathname === '/profile' ? 'page' : undefined}
          >
            <HugeiconsIcon icon={Profile02Icon} size={23} strokeWidth={1.8} />
            <span>{t('nav.mobileProfile')}</span>
          </Link>
        </div>
      </nav>

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
