import { Bookmark02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../stores/authStore';
import { useFavoritesStore } from '../../favorites/model/favoritesStore';

export function TermCardFavoriteButton({ termRef, termName, className = '' }: { termRef: string; termName: string; className?: string }) {
  const { t } = useTranslation();
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  const favorite = useFavoritesStore((s) => Boolean(s.statusByTermRef[termRef]));
  const pending = useFavoritesStore((s) => Boolean(s.pendingByTermRef[termRef]));
  const toggle = useFavoritesStore((s) => s.toggleFavorite);
  if (!authenticated) return null;
  return <span className={`inline-flex ${className}`}><button type="button" data-term-card-favorite aria-label={favorite ? t('favorites.removeTermAria', { term: termName }) : t('favorites.saveTermAria', { term: termName })} aria-pressed={favorite} aria-busy={pending} disabled={pending} onClick={() => void toggle(termRef).catch(() => undefined)} className="flex size-11 items-center justify-center rounded-[8px] border-0 bg-transparent text-[#161519] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="flex size-6 items-center justify-center"><HugeiconsIcon icon={Bookmark02Icon} size={24} strokeWidth={1.6} className={favorite ? 'fill-current text-[#6a37c3]' : undefined} /></span></button></span>;
}
