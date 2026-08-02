import { HugeiconsIcon } from '@hugeicons/react';
import {
  ChartAnalysisIcon,
  CheckmarkSquare02Icon,
  Home03Icon,
  Robot01Icon,
  Search01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { Link } from 'react-router-dom';
import type { User } from '../types';
import type { DesktopShellItem } from '../features/navigation/model/desktopShellPolicy';

type SidebarLinkItem = {
  id: Exclude<DesktopShellItem, 'algosha'>;
  label: string;
  to: string;
  icon: typeof Home03Icon;
};

const SIDEBAR_LINKS: SidebarLinkItem[] = [
  { id: 'home', label: 'Главная', to: '/', icon: Home03Icon },
  { id: 'tests', label: 'Тесты', to: '/tests', icon: CheckmarkSquare02Icon },
  { id: 'search', label: 'Поиск', to: '/search', icon: Search01Icon },
  { id: 'analyze', label: 'Анализ ЕНТ', to: '/analyze', icon: ChartAnalysisIcon },
];

function itemClass(isActive: boolean): string {
  return [
    'flex h-[48px] w-full items-center gap-[16px] rounded-[8px] px-[16px] py-[8px]',
    'text-left text-[18px] leading-[18px] transition-colors',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]',
    isActive ? 'bg-[#6a37c3] text-white' : 'text-[#6e6779] hover:bg-[#f8f5fc]',
  ].join(' ');
}

export function DesktopSidebar({
  activeItem,
  user,
}: {
  activeItem: DesktopShellItem | null;
  user: User | null;
}) {
  const displayName = user?.username?.trim() || user?.email || 'Profile';

  return (
    <aside
      aria-label="Основная навигация"
      data-desktop-sidebar
      data-figma-node="602:2457"
      className="hidden md:flex sticky top-0 self-start h-screen w-[320px] shrink-0 flex-col items-start justify-between border border-solid border-[#ded2f1] bg-white p-8"
    >
      <div className="flex w-full shrink-0 flex-col items-start gap-8">
        <Link to="/" aria-label="Infopedia" className="block h-[44px] w-[170px] shrink-0">
          <img src="/logo.svg" alt="Infopedia" className="block h-[44px] w-[170px]" />
        </Link>

        <nav aria-label="Основные разделы" className="flex w-full flex-col items-start gap-[8px]">
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
            className={`${itemClass(activeItem === 'algosha')} cursor-not-allowed disabled:opacity-100`}
          >
            <HugeiconsIcon icon={Robot01Icon} size={24} strokeWidth={1.5} aria-hidden="true" />
            <span>Algosha AI</span>
          </button>
        </nav>
      </div>

      <Link
        to="/profile"
        aria-label={`Профиль: ${displayName}`}
        className="flex h-[48px] w-full min-w-0 items-center gap-[16px] rounded-[8px] px-[16px] py-[8px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a37c3]"
      >
        <HugeiconsIcon icon={UserIcon} size={24} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-[#6e6779]" />
        <span className="flex min-w-0 flex-col items-start justify-center gap-[4px] overflow-hidden not-italic">
          <span className="block w-full truncate font-medium text-[20px] leading-[20px] text-[#6e6779]" title={displayName}>
            {displayName}
          </span>
          <span className="block text-[#b1acb9] text-[16px] leading-[16px]">Free plan</span>
        </span>
      </Link>
    </aside>
  );
}
