import { Bookmark02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../stores/authStore';
import { useFavoritesStore } from '../model/favoritesStore';

export interface FavoriteToggleProps {
  termRef: string;
  termName: string;
  className?: string;
  ensureStatus?: boolean;
  appearance: 'mobile-card' | 'mobile-header';
}

export function FavoriteToggle({
  termRef,
  termName,
  className = '',
  ensureStatus = true,
  appearance,
}: FavoriteToggleProps) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isFavorite = useFavoritesStore((state) => Boolean(state.statusByTermRef[termRef]));
  const pending = useFavoritesStore((state) => Boolean(state.pendingByTermRef[termRef]));
  const error = useFavoritesStore((state) => state.errorByTermRef[termRef]);
  const ensureStatuses = useFavoritesStore((state) => state.ensureStatuses);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  useEffect(() => {
    if (!isAuthenticated || !ensureStatus || !termRef) return;
    void ensureStatuses([termRef]).catch(() => undefined);
  }, [ensureStatus, ensureStatuses, isAuthenticated, termRef]);

  if (!isAuthenticated) return null;

  const label = isFavorite
    ? t('favorites.removeTermAria', {
        defaultValue: 'Remove {{term}} from favorites',
        term: termName,
      })
    : t('favorites.saveTermAria', {
        defaultValue: 'Save {{term}} to favorites',
        term: termName,
      });
  const errorLabel = error
    ? t('favorites.updateFailed', {
        defaultValue: 'Could not update favorites. Try again.',
      })
    : null;
  const hasCallerPosition = /(?:^|\s)(?:absolute|fixed|relative|static|sticky)(?:\s|$)/.test(className);
  const positionClass = appearance === 'mobile-card' ? 'absolute' : hasCallerPosition ? '' : 'relative';

  return (
    <span className={`${positionClass} inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={isFavorite}
        aria-busy={pending}
        disabled={pending}
        onClick={() => {
          void toggleFavorite(termRef).catch(() => undefined);
        }}
        className={`flex size-11 items-center justify-center rounded-[8px] border-0 bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-60 ${isFavorite ? 'text-[#6a37c3]' : 'text-[#161519] hover:text-[#6a37c3]'}`}
      >
        <span className="flex size-6 items-center justify-center">
          <HugeiconsIcon
            icon={Bookmark02Icon}
            size={24}
            strokeWidth={1.6}
            className={isFavorite ? 'fill-current' : undefined}
          />
        </span>
      </button>
      {errorLabel && (
        <span role="alert" className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-[11px] leading-none text-danger">
          {errorLabel}
        </span>
      )}
    </span>
  );
}
