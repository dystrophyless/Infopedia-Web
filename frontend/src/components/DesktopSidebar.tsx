import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AllBookmarkIcon,
  ChartAnalysisIcon,
  CheckmarkSquare02Icon,
  Home03Icon,
  InformationCircleIcon,
  Logout01Icon,
  Robot01Icon,
  Search01Icon,
  Settings01Icon,
  Target03Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { Link } from 'react-router-dom';
import aiCoEditingAsset from '../assets/figma-profile/ai-co-editing.svg';
import type { DesktopShellItem } from '../features/navigation/model/desktopShellPolicy';
import type { User } from '../types';

type SidebarLinkItem = {
  id: Exclude<DesktopShellItem, 'algosha' | 'profile'>;
  label: string;
  to: string;
  icon: typeof Home03Icon;
};

const SIDEBAR_LINKS: SidebarLinkItem[] = [
  { id: 'home', label: 'Главная', to: '/', icon: Home03Icon },
  { id: 'search', label: 'Поиск', to: '/search', icon: Search01Icon },
  { id: 'tests', label: 'Тесты', to: '/tests', icon: CheckmarkSquare02Icon },
  { id: 'analyze', label: 'Анализ ЕНТ', to: '/analyze', icon: ChartAnalysisIcon },
];

const PROFILE_MENU_ID = 'desktop-sidebar-profile-menu';
const focusClass = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]';

function itemClass(isActive: boolean): string {
  return [
    'flex h-[48px] w-full items-center gap-[16px] rounded-[8px] px-[16px] py-[8px]',
    'text-left text-[16px] font-normal leading-[16px] transition-colors',
    focusClass,
    isActive ? 'bg-[#f8f5fc] text-[#865bcf]' : 'text-[#6e6779] hover:bg-[#f8f5fc]',
  ].join(' ');
}

function profileActionClass(disabled = false): string {
  return [
    'flex w-full items-center gap-[8px] rounded-[4px] px-[8px] py-[6px] text-left text-[14px] font-normal leading-[14px] text-[#4c268c] transition-colors',
    focusClass,
    disabled ? 'cursor-not-allowed disabled:opacity-100' : 'hover:bg-[#ded2f1]',
  ].join(' ');
}

function ProfileMenuIcon({ icon }: { icon: typeof Home03Icon }) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={20}
      strokeWidth={1.5}
      aria-hidden="true"
      className="size-[20px] shrink-0"
    />
  );
}

export function DesktopSidebar({
  activeItem,
  onLogout,
  user,
}: {
  activeItem: DesktopShellItem | null;
  onLogout: () => void;
  user: User | null;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileDisclosureRef = useRef<HTMLDivElement>(null);
  const firstProfileActionRef = useRef<HTMLAnchorElement>(null);
  const displayName = user?.username?.trim() || user?.email || 'Profile';
  const profileIsActive = activeItem === 'profile';
  const profileLooksActive = profileIsActive || profileOpen;

  useEffect(() => {
    if (!profileOpen) return undefined;
    firstProfileActionRef.current?.focus();

    function closeFromOutsidePointer(event: PointerEvent) {
      if (!profileDisclosureRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }

    function closeFromOutsideFocus(event: FocusEvent) {
      if (!profileDisclosureRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', closeFromOutsidePointer);
    document.addEventListener('focusin', closeFromOutsideFocus);
    document.addEventListener('keydown', closeFromEscape);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutsidePointer);
      document.removeEventListener('focusin', closeFromOutsideFocus);
      document.removeEventListener('keydown', closeFromEscape);
    };
  }, [profileOpen]);

  function closeProfileMenu() {
    setProfileOpen(false);
  }

  function handleLogout() {
    closeProfileMenu();
    onLogout();
  }

  const profileRowClass = [
    'flex h-[48px] w-full min-w-0 items-center gap-[16px] rounded-[8px] px-[16px] py-[8px] text-left transition-colors',
    focusClass,
    profileLooksActive ? 'bg-[#f8f5fc]' : 'hover:bg-[#f8f5fc]',
  ].join(' ');

  return (
    <aside
      aria-label="Основная навигация"
      data-desktop-sidebar
      data-figma-node="602:2457"
      className="hidden md:flex sticky top-0 self-start h-screen w-[320px] shrink-0 flex-col items-start justify-between border border-solid border-[#ded2f1] bg-white p-[32px]"
    >
      <div className="flex w-full shrink-0 flex-col items-start gap-[32px]">
        <Link to="/" aria-label="Infopedia" className="block h-[43.736px] w-[170.37px] shrink-0">
          <img src="/logo.svg" alt="Infopedia" className="block h-[43.736px] w-[170.37px]" />
        </Link>

        <nav aria-label="Основные разделы" className="flex w-[256px] flex-col items-start gap-[8px]">
          {SIDEBAR_LINKS.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <Link
                key={item.id}
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={itemClass(isActive)}
              >
                <HugeiconsIcon icon={item.icon} size={24} strokeWidth={1.5} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Algosha AI пока недоступен"
            className={itemClass(activeItem === 'algosha') + ' cursor-not-allowed disabled:opacity-100'}
          >
            <HugeiconsIcon icon={Robot01Icon} size={24} strokeWidth={1.5} aria-hidden="true" />
            <span>Algosha AI</span>
          </button>
        </nav>
      </div>

      <div data-profile-disclosure ref={profileDisclosureRef} className="relative flex h-[48px] w-[256px] flex-col items-start">
        {profileOpen && (
          <div
            id={PROFILE_MENU_ID}
            aria-label="Меню профиля"
            className="absolute bottom-[56px] left-0 z-20 flex w-[256px] flex-col items-start gap-[8px] rounded-[16px] bg-[#efeaf8] p-[8px]"
          >
            <div className="flex w-full flex-col items-start">
              <Link ref={firstProfileActionRef} to="/favorites" onClick={closeProfileMenu} className={profileActionClass()}>
                <ProfileMenuIcon icon={AllBookmarkIcon} />
                <span>Избранное</span>
              </Link>
              <Link to="/profile?tab=weakTopics" onClick={closeProfileMenu} className={profileActionClass()}>
                <ProfileMenuIcon icon={Target03Icon} />
                <span>Слабые темы</span>
              </Link>
            </div>

            <div data-profile-menu-divider className="h-px w-full shrink-0 bg-[#ded2f1]" />

            <div className="flex w-full flex-col items-start">
              <Link to="/subscription" onClick={closeProfileMenu} className={profileActionClass()}>
                <span
                  data-profile-subscription-icon
                  aria-hidden="true"
                  className="size-[20px] shrink-0 bg-[#4c268c]"
                  style={{
                    maskImage: `url("${aiCoEditingAsset}")`,
                    maskPosition: 'center',
                    maskRepeat: 'no-repeat',
                    maskSize: '100% 100%',
                    WebkitMaskImage: `url("${aiCoEditingAsset}")`,
                    WebkitMaskPosition: 'center',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskSize: '100% 100%',
                  }}
                />
                <span>Купить подписку</span>
              </Link>
              <Link to="/profile?tab=settings" onClick={closeProfileMenu} className={profileActionClass()}>
                <ProfileMenuIcon icon={Settings01Icon} />
                <span>Настройки</span>
              </Link>
              <button type="button" disabled aria-disabled="true" className={profileActionClass(true)}>
                <ProfileMenuIcon icon={InformationCircleIcon} />
                <span>Справка</span>
              </button>
            </div>

            <div data-profile-menu-divider className="h-px w-full shrink-0 bg-[#ded2f1]" />

            <button type="button" onClick={handleLogout} className={profileActionClass()}>
              <ProfileMenuIcon icon={Logout01Icon} />
              <span>Выйти</span>
            </button>
          </div>
        )}

        <button
          ref={profileButtonRef}
          type="button"
          aria-label={'Профиль: ' + displayName}
          aria-current={profileIsActive ? 'page' : undefined}
          aria-expanded={profileOpen}
          aria-controls={PROFILE_MENU_ID}
          onClick={() => setProfileOpen((open) => !open)}
          className={profileRowClass}
        >
          <HugeiconsIcon
            icon={UserIcon}
            size={24}
            strokeWidth={1.5}
            aria-hidden="true"
            className={'shrink-0 ' + (profileLooksActive ? 'text-[#865bcf]' : 'text-[#6e6779]')}
          />
          <span className="flex min-w-0 flex-col items-start justify-center gap-[4px] overflow-hidden not-italic">
            <span
              className={'block w-full truncate text-[16px] font-medium leading-[16px] ' + (profileLooksActive ? 'text-[#865bcf]' : 'text-[#6e6779]')}
              title={displayName}
            >
              {displayName}
            </span>
            <span className={'block text-[14px] font-normal leading-[14px] ' + (profileLooksActive ? 'text-[#a585db]' : 'text-[#b1acb9]')}>
              Free plan
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
}
