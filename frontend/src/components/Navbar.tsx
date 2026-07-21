import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { LanguageSwitcher } from './LanguageSwitcher';
import { FigmaProfileIcon } from './FigmaIcons';
import { SearchChoiceModal } from './SearchChoiceModal';

const SEARCH_NAV_PATHS = new Set(['/search', '/semantic-search']);

function authTarget(path: string, isAuthenticated: boolean): string {
  if (isAuthenticated) return path;
  return `/login?next=${encodeURIComponent(path)}`;
}

export function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLandingPage = location.pathname === '/';
  const searchNavIsActive = SEARCH_NAV_PATHS.has(location.pathname);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap px-4 py-4 text-[16px] leading-none transition-colors ${
      isActive ? 'font-medium text-accent' : 'text-muted hover:text-accent'
    }`;

  const marketingLinkClass =
    'whitespace-nowrap border-0 bg-transparent px-4 py-4 text-[16px] leading-none text-muted transition-colors hover:text-accent';

  return (
    <>
      <header className="sticky top-0 z-40 flex h-[80px] w-full items-center border-b border-border/30 bg-surface max-md:hidden">
        <div className="flex w-full min-w-0 items-center justify-between px-[60px] max-lg:px-8 max-md:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Infopedia">
            <img src="/logo.svg" alt="Infopedia" className="h-[44px] w-auto" />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="primary">
            {isAuthenticated ? (
              <>
                <Link
                  to="/search"
                  className={`px-5 py-4 text-[16px] leading-none transition-colors ${
                    searchNavIsActive
                      ? 'font-medium text-accent'
                      : 'text-muted hover:text-accent'
                  }`}
                >
                  {t('nav.search')}
                </Link>
                <NavLink to="/tests" className={navLinkClass}>
                  {t('nav.tests', { defaultValue: 'Тесты' })}
                </NavLink>
                <NavLink to="/analyze" className={navLinkClass}>
                  {t('nav.analyze')}
                </NavLink>
              </>
            ) : (
              isLandingPage && (
                <>
                  <button
                    type="button"
                    className={marketingLinkClass}
                    onClick={() => setSearchModalOpen(true)}
                  >
                    {t('nav.search')}
                  </button>
                  <a href="#tools" className={marketingLinkClass}>
                    {t('nav.analyze')}
                  </a>
                </>
              )
            )}
          </nav>

          <div className="flex h-[64px] items-center gap-4">
            <LanguageSwitcher />
            <span className="h-10 w-px bg-border/60" aria-hidden />
            {isAuthenticated ? (
              <Link
                to="/profile"
                aria-label={t('nav.profile')}
                className="text-accent transition-opacity hover:opacity-90"
              >
                <FigmaProfileIcon className="block size-[38px]" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-[10px] bg-accent px-5 py-3 text-[16px] leading-none text-surface transition-opacity hover:opacity-90"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      </header>
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
