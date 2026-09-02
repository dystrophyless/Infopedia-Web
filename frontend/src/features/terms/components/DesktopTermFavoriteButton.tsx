import { Bookmark02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../stores/authStore';
import { useFavoritesStore } from '../../favorites/model/favoritesStore';

interface DesktopTermFavoriteButtonProps {
  termRef: string;
  termName: string;
}

export function DesktopTermFavoriteButton({ termRef, termName }: DesktopTermFavoriteButtonProps) {
  const { t } = useTranslation();
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const favorite = useFavoritesStore((state) => Boolean(state.statusByTermRef[termRef]));
  const pending = useFavoritesStore((state) => Boolean(state.pendingByTermRef[termRef]));
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  if (!authenticated) return null;

  const label = favorite
    ? t('favorites.removeTermAria', { term: termName })
    : t('favorites.saveTermAria', { term: termName });

  return (
    <button
      type="button"
      data-term-detail-favorite
      aria-label={label}
      aria-pressed={favorite}
      aria-busy={pending}
      disabled={pending}
      onClick={() => void toggleFavorite(termRef).catch(() => undefined)}
      className="flex size-10 shrink-0 items-center justify-center rounded-[8px] border-0 bg-transparent text-[#6e6779] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-60"
    >
      <HugeiconsIcon
        icon={Bookmark02Icon}
        size={24}
        strokeWidth={2}
        className={favorite ? 'fill-current text-[#6a37c3]' : undefined}
      />
    </button>
  );
}
