import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ChartAnalysisIcon,
  CheckmarkSquare02Icon,
  Search01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { useAuthStore } from '../stores/authStore';
import type { MobileBottomNavItem } from '../features/navigation';
import { SearchChoiceModal } from './SearchChoiceModal';

function authTarget(path: string, isAuthenticated: boolean): string {
  if (isAuthenticated) return path;
  return `/login?next=${encodeURIComponent(path)}`;
}

const itemBaseClass =
  'flex h-10 min-w-0 appearance-none flex-col items-center justify-start gap-2 border-0 p-0 text-center text-[10px] font-normal leading-none no-underline transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]';
const inactiveItemClass = 'bg-transparent text-[#524d5b]';
const activeItemClass = 'text-[#6a37c3]';

const labelClass = 'block w-full overflow-hidden text-ellipsis whitespace-nowrap';

function getItemClass(isActive: boolean): string {
  return `${itemBaseClass} ${isActive ? activeItemClass : inactiveItemClass}`;
}

export function MobileBottomNav({ activeItem }: { activeItem: MobileBottomNavItem | null }) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const searchIsActive = activeItem === 'search';
  const testsIsActive = activeItem === 'tests';
  const analyzeIsActive = activeItem === 'analyze';
  const profileIsActive = activeItem === 'profile';

  return (
    <>
      <nav
        aria-label={t('mobile.bottomNavigation', { defaultValue: 'Bottom navigation' })}
        data-between-blocks-boundary
        data-figma-node="14:1564"
        className="bottom-nav md:hidden"
      >
        <div className="bottom-nav-inner mx-auto grid h-[88px] w-full max-w-[430px] grid-cols-4 px-[7px] pt-3">
          <button
            type="button"
            className={getItemClass(searchIsActive)}
            aria-current={searchIsActive ? 'page' : undefined}
            onClick={() => setSearchModalOpen(true)}
          >
            <HugeiconsIcon icon={Search01Icon} size={24} strokeWidth={1.5} />
            <span className={labelClass}>{t('nav.search')}</span>
          </button>

          <Link
            to="/tests"
            className={getItemClass(testsIsActive)}
            aria-current={testsIsActive ? 'page' : undefined}
          >
            <HugeiconsIcon icon={CheckmarkSquare02Icon} size={24} strokeWidth={1.5} />
            <span className={labelClass}>{t('nav.tests')}</span>
          </Link>

          <Link
            to="/analyze"
            className={getItemClass(analyzeIsActive)}
            aria-current={analyzeIsActive ? 'page' : undefined}
          >
            <HugeiconsIcon icon={ChartAnalysisIcon} size={24} strokeWidth={1.5} />
            <span className={labelClass}>{t('nav.analyze')}</span>
          </Link>

          <Link
            to="/profile"
            className={getItemClass(profileIsActive)}
            aria-current={profileIsActive ? 'page' : undefined}
          >
            <HugeiconsIcon icon={UserIcon} size={24} strokeWidth={1.5} />
            <span className={labelClass}>
              {t('profile.navProfile', { defaultValue: t('nav.profile') })}
            </span>
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
