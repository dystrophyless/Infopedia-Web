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
  appearance?: 'default' | 'mobile-card' | 'mobile-header';
}

export function FavoriteToggle({
  termRef,
  termName,
  className = '',
  ensureStatus = true,
  appearance = 'default',
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
  const mobileCardAppearance = appearance === 'mobile-card';
  const mobileHeaderAppearance = appearance === 'mobile-header';
  const compactMobileAppearance = mobileCardAppearance || mobileHeaderAppearance;
  const hasCallerPosition = /(?:^|\s)(?:absolute|fixed|relative|static|sticky)(?:\s|$)/.test(className);
  const positionClass = mobileCardAppearance ? 'absolute' : mobileHeaderAppearance ? 'relative' : hasCallerPosition ? '' : 'relative';

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
        className={`flex size-11 items-center justify-center rounded-[8px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-60 ${
          compactMobileAppearance
            ? `border-0 bg-transparent ${isFavorite ? 'text-[#6a37c3]' : 'text-[#161519] hover:text-[#6a37c3]'}`
            : `border ${isFavorite ? 'border-accent bg-accent text-white' : 'border-border bg-surface text-muted hover:border-accent hover:text-accent'}`
        }`}
      >
        <HugeiconsIcon
          icon={Bookmark02Icon}
          size={compactMobileAppearance ? 24 : 22}
          strokeWidth={compactMobileAppearance ? 1.6 : 1.7}
          className={isFavorite ? 'fill-current' : undefined}
        />
      </button>
      {errorLabel && (
        <span role="alert" className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-surface px-2 py-1 text-[11px] leading-none text-danger shadow-card">
          {errorLabel}
        </span>
      )}
    </span>
  );
}
