import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { Logout01Icon } from '@hugeicons/core-free-icons';
import { useAuthStore } from '../stores/authStore';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-5 py-4 text-[16px] transition-colors ${
      isActive ? 'text-accent font-medium' : 'text-muted hover:text-accent'
    }`;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="bg-surface h-[80px] flex items-center w-full border-b border-border/30 sticky top-0 z-40">
      <div className="w-full flex items-center justify-between px-[60px] max-md:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Infopedia">
          <img src="/logo.svg" alt="Infopedia" className="h-[44px] w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-2" aria-label="primary">
          {isAuthenticated && (
            <>
              <NavLink to="/search" className={navLinkClass}>
                {t('nav.search')}
              </NavLink>
              <NavLink to="/semantic-search" className={navLinkClass}>
                {t('nav.semanticSearch')}
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                {t('nav.profile')}
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4 h-[64px]">
          <LanguageSwitcher />
          <span className="h-10 w-px bg-border/60" aria-hidden />
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 bg-accent text-surface rounded-[10px] px-5 py-3 text-[16px] hover:opacity-90 transition-opacity"
            >
              <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={1.8} />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="bg-accent text-surface rounded-[10px] px-5 py-3 text-[16px] hover:opacity-90 transition-opacity"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
