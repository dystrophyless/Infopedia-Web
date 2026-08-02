import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  const marketingLinkClass =
    'whitespace-nowrap border-0 bg-transparent px-4 py-4 text-[16px] leading-none text-muted transition-colors hover:text-accent';

  return (
    <header className="sticky top-0 z-40 flex h-[80px] w-full items-center border-b border-border/30 bg-surface max-md:hidden">
        <div className="flex w-full min-w-0 items-center justify-between px-[70px] max-lg:px-8 max-md:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Infopedia">
            <img src="/logo.svg" alt="Infopedia" className="h-[44px] w-auto" />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="primary">
            {isLandingPage && (
              <>
                <a href="#tools" className={marketingLinkClass}>
                  {t('nav.features')}
                </a>
                <a href="#featured-terms" className={marketingLinkClass}>
                  {t('nav.termBase')}
                </a>
                <Link to="/subscription" className={marketingLinkClass}>
                  {t('nav.subscription')}
                </Link>
              </>
            )}
          </nav>

          <div className="flex h-[64px] items-center gap-4">
            <LanguageSwitcher />
            <span className="h-10 w-px bg-border/60" aria-hidden />
            <Link
              to="/login"
              className="flex h-10 w-[98px] items-center justify-center rounded-[16px] bg-accent px-5 text-[16px] leading-none text-surface transition-opacity hover:opacity-90"
            >
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </header>
  );
}
