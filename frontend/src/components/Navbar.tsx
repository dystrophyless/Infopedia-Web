import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { LanguageSwitcher } from './LanguageSwitcher';
import guestHeaderLogoAsset from '../assets/figma-landing/guest-header-logo.svg';

function getActualHeaderHeight(header: HTMLElement | null) {
  return header?.getBoundingClientRect().height ?? 0;
}

export function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!isLandingPage) {
      setActiveSection(null);
      root.style.removeProperty('--header-offset');
      return;
    }

    const updateActiveSection = () => {
      const headerOffset = getActualHeaderHeight(headerRef.current);
      const activationY = headerOffset + 24;
      const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-section]'));
      let activeNavSection: HTMLElement | null = null;

      for (const section of sections) {
        if (section.getBoundingClientRect().top <= activationY) {
          activeNavSection = section;
        } else {
          break;
        }
      }

      root.style.setProperty('--header-offset', `${headerOffset}px`);
      setActiveSection(activeNavSection?.id ?? null);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
      root.style.removeProperty('--header-offset');
    };
  }, [isLandingPage]);

  const marketingLinkClass =
    'nav-item inline-flex items-center justify-center whitespace-nowrap border-0 bg-transparent px-[12px] py-[8px] text-[14px] font-normal leading-none';

  return (
    <header ref={headerRef} data-desktop-guest-navbar className="sticky top-0 z-40 flex h-[64px] w-full items-start bg-white py-[15px] max-md:hidden">
      <div data-desktop-content-rail className="mx-auto flex h-[34px] w-full max-w-[1152px] items-center justify-between px-[24px]">
        <div className="flex h-[32px] w-[732px] shrink-0 items-center justify-between">
          <Link to="/" className="flex h-[32px] w-[124px] shrink-0 items-center" aria-label="Infopedia">
            <img src={guestHeaderLogoAsset} alt="Infopedia" className="h-[32px] w-[124px]" />
          </Link>

          <nav className="flex h-[30px] shrink-0 items-center justify-center gap-[4px]" aria-label="primary">
            {isLandingPage && (
              <>
                <a href="#tools" className={`${marketingLinkClass} min-w-[112px]`} aria-current={activeSection === 'tools' ? 'true' : undefined}>
                  <span>{t('nav.features')}</span>
                  <span className="nav-item__underline" aria-hidden="true" />
                </a>
                <a href="#featured-terms" className={`${marketingLinkClass} min-w-[120px]`} aria-current={activeSection === 'featured-terms' ? 'true' : undefined}>
                  <span>{t('nav.termBase')}</span>
                  <span className="nav-item__underline" aria-hidden="true" />
                </a>
                <a href="#desktop-analysis" className={`${marketingLinkClass} min-w-[103px]`} aria-current={activeSection === 'desktop-analysis' ? 'true' : undefined}>
                  <span>{t('nav.analyze')}</span>
                  <span className="nav-item__underline" aria-hidden="true" />
                </a>
              </>
            )}
          </nav>
        </div>

        <div className="flex h-[34px] shrink-0 items-center gap-[8px]">
          <LanguageSwitcher compact />
          <Link
            to="/login"
            className="flex h-[34px] w-[72px] items-center justify-center px-[16px] py-[8px] text-[14px] font-normal leading-none text-[#161519]"
          >
            {t('nav.login')}
          </Link>
          <Link
            to="/onboarding"
            className="flex h-[34px] w-[100px] items-center justify-center gap-[4px] rounded-[8px] bg-[#6a37c3] px-[16px] py-[8px] text-[14px] font-normal leading-none text-white"
          >
            <span>{t('nav.start')}</span>
            <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={2} className="shrink-0" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
