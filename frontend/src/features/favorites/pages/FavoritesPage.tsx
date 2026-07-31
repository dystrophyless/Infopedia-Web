import {
  AllBookmarkIcon,
  ArrowLeft01Icon,
  Delete02Icon,
  StarIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import type { Term } from '../../../types';
import {
  BetweenBlocks,
  Button,
  EmptyState,
  IconButton,
  MobilePageFrame,
  Text,
} from '../../../ui';
import { SkeletonCard } from '../../../components/SkeletonCard';
import { DefinitionMetadata } from '../../terms/components/DefinitionMetadata';
import { MobileSearchTermCard } from '../../terms/components/MobileSearchTermCard';
import { TermCard } from '../../terms/components/TermCard';
import { normalizeDefinitionPreviewText } from '../../terms/model';
import { useFavoritesStore } from '../model';

const PAGE_SIZE = 20;

function getRelatedTerms(term: Term, terms: Term[]): Pick<Term, 'public_id' | 'name'>[] {
  return terms
    .filter((candidate) => candidate.public_id !== term.public_id)
    .slice(0, 2)
    .map(({ public_id, name }) => ({ public_id, name }));
}

function FavoriteTermCard({ term, terms }: { term: Term; terms: Term[] }) {
  const { t } = useTranslation();
  const removeFavorite = useFavoritesStore((state) => state.removeFavorite);
  const pending = useFavoritesStore((state) => Boolean(state.pendingByTermRef[term.public_id]));
  const actionError = useFavoritesStore((state) => state.errorByTermRef[term.public_id]);
  const definition = term.definitions?.[0];

  const handleRemove = useCallback(() => {
    void removeFavorite(term.public_id).catch(() => undefined);
  }, [removeFavorite, term.public_id]);

  return (
    <article className="rounded-[8px] bg-white p-5 text-[#161519] shadow-none md:border md:border-border/40 md:p-6">
      <div className="flex items-start gap-3">
        <Link
          to={`/terms/${term.public_id}`}
          state={{ backTo: '/favorites', term, relatedTerms: getRelatedTerms(term, terms) }}
          className="min-w-0 flex-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[#6a37c3] focus-visible:ring-offset-2"
        >
          <h2 className="text-[20px] font-medium leading-[20px] text-[#252329]">{term.name}</h2>
          {definition && (
            <p className="mt-3 line-clamp-3 whitespace-pre-line text-[15px] leading-[15px] text-[#39363f]">
              {normalizeDefinitionPreviewText(definition.text)}
            </p>
          )}
          <DefinitionMetadata definition={definition} variant="compact" />
        </Link>
        <IconButton
          aria-label={t('favorites.removeAria', { defaultValue: 'Remove from favorites' })}
          onClick={handleRemove}
          disabled={pending}
          className="text-[#6a37c3]"
        >
          <HugeiconsIcon icon={pending ? StarIcon : Delete02Icon} size={20} strokeWidth={1.7} />
        </IconButton>
      </div>
      {actionError && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[6px] bg-[#fff1f1] px-3 py-2 text-[13px] text-danger" role="alert">
          <span>{t('favorites.actionError', { defaultValue: actionError })}</span>
          <Button size="sm" variant="secondary" onClick={handleRemove} disabled={pending}>
            {t('common.retry', { defaultValue: 'Retry' })}
          </Button>
        </div>
      )}
    </article>
  );
}

// Kept as a private behavior reference while the canonical TermCard owns rendering.
void FavoriteTermCard;

export function FavoritesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const ownerUserId = user?.id ?? null;
  const setOwnerUserId = useFavoritesStore((state) => state.setOwnerUserId);
  const list = useFavoritesStore((state) => state.list);
  const total = useFavoritesStore((state) => state.total);
  const serverConsumed = useFavoritesStore((state) => state.serverConsumed);
  const limit = useFavoritesStore((state) => state.limit);
  const hasMore = useFavoritesStore((state) => state.hasMore);
  const isLoading = useFavoritesStore((state) => state.isLoading);
  const error = useFavoritesStore((state) => state.error);
  const loadFavorites = useFavoritesStore((state) => state.loadFavorites);

  useEffect(() => {
    setOwnerUserId(ownerUserId);
  }, [ownerUserId, setOwnerUserId]);

  useEffect(() => {
    if (ownerUserId === null) return;
    void loadFavorites({ skip: 0, limit: PAGE_SIZE, append: false }).catch(() => undefined);
  }, [loadFavorites, ownerUserId]);

  const retry = () => {
    void loadFavorites({ skip: 0, limit: PAGE_SIZE, append: false }).catch(() => undefined);
  };

  const loadMore = () => {
    void loadFavorites({ skip: serverConsumed, limit, append: true }).catch(() => undefined);
  };

  const showEmptyState = !isLoading && !error && list.length === 0;

  const content = (
    <div
      className={showEmptyState
        ? 'flex w-full flex-1 flex-col md:mx-auto md:max-w-[760px] md:px-8 md:pb-16 md:pt-12'
        : 'mx-auto w-full max-w-[760px] px-4 pb-8 md:px-8 md:pb-16 md:pt-12'}
    >
      <header className="mb-6 hidden md:block">
        <h1 className="text-[38px] font-medium leading-none text-text">
          {t('favorites.title', { defaultValue: 'Favorites' })}
        </h1>
        <p className="mt-3 text-[16px] text-muted">
          {t('favorites.subtitle', { defaultValue: 'Terms you saved for later' })}
        </p>
      </header>

      {isLoading && list.length === 0 && (
        <>
          <div className="hidden space-y-4 md:block" aria-label="Loading favorites" role="status">
            {Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} />)}
          </div>
          <div className="hidden space-y-4 max-md:-mx-[2px] max-md:block max-md:w-[calc(100%+4px)]" aria-label="Loading favorites" role="status">
            {Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} variant="mobile-term-card" />)}
          </div>
        </>
      )}

      {!isLoading && error && list.length === 0 && (
        <section className="rounded-[8px] bg-white p-8 text-center" role="alert">
          <Text tone="danger" className="text-[16px]">
            {t('favorites.loadError', { defaultValue: 'Unable to load favorites.' })}
          </Text>
          <Button className="mt-5" onClick={retry}>
            {t('common.retry', { defaultValue: 'Retry' })}
          </Button>
        </section>
      )}

      {showEmptyState && (
        <BetweenBlocks
          data-mobile-outcome-slot
          className="px-6 md:flex md:items-center md:justify-center md:px-6"
          outcomeClassName="flex justify-center"
        >
          <EmptyState
            variant="outcome"
            data-mobile-outcome-paint
            title={t('favorites.emptyTitle', { defaultValue: 'No favorites yet' })}
            description={t('favorites.emptyBody', { defaultValue: 'Save terms while browsing to find them here.' })}
            icon={<HugeiconsIcon icon={AllBookmarkIcon} className="size-full" aria-hidden="true" />}
            partProps={{
              icon: { className: 'shrink-0 !bg-[#ded2f1] !text-[#6a37c3]' },
              title: { className: 'text-[#161519]' },
              description: { className: '!text-[#6e6779]' },
            }}
            action={(
              <Button
                data-mobile-outcome-action
                type="button"
                size="sm"
                fullWidth
                onClick={() => navigate('/search')}
                className="h-10 min-h-10 rounded-[8px] !bg-[#6a37c3] px-4 !text-white text-[16px] font-medium leading-[16px] !opacity-100 hover:!bg-[#6a37c3] hover:!opacity-100 focus:!bg-[#6a37c3] focus:!opacity-100 focus-visible:!bg-[#6a37c3] focus-visible:!opacity-100 active:!bg-[#6a37c3] active:!opacity-100"
              >
                {t('favorites.searchCta', { defaultValue: 'Искать термины' })}{' '}
                <span aria-hidden="true">→</span>
              </Button>
            )}
          />
        </BetweenBlocks>
      )}

      {list.length > 0 && (
        <>
          <p className="mb-4 text-[16px] font-normal leading-none text-[#514b5c] md:hidden">
            {t('favorites.count', { count: total, defaultValue: `${total}` })}
          </p>
          <div className="hidden flex-col gap-4 md:flex" aria-label={t('favorites.listLabel', { defaultValue: 'Favorite terms' })}>
            {list.map((term) => (
              <TermCard
                key={term.public_id}
                term={term}
                relatedTerms={getRelatedTerms(term, list)}
                backTo="/favorites"
              />
            ))}
          </div>
          <div className="hidden flex-col gap-4 max-md:-mx-[2px] max-md:flex max-md:w-[calc(100%+4px)]" aria-label={t('favorites.listLabel', { defaultValue: 'Favorite terms' })}>
            {list.map((term) => (
              <MobileSearchTermCard
                key={term.public_id}
                term={term}
                relatedTerms={getRelatedTerms(term, list)}
                backTo="/favorites"
              />
            ))}
          </div>
        </>
      )}

      {error && list.length > 0 && (
        <section className="mt-4 flex items-center justify-between gap-3 rounded-[8px] bg-white px-4 py-3 text-[14px] text-danger" role="alert">
          <span>{t('favorites.loadError', { defaultValue: 'Unable to load more favorites.' })}</span>
          <Button size="sm" variant="secondary" onClick={loadMore} disabled={isLoading}>
            {t('common.retry', { defaultValue: 'Retry' })}
          </Button>
        </section>
      )}

      {hasMore && !error && (
        <Button fullWidth variant="surface" className="mt-5" onClick={loadMore} loading={isLoading}>
          {t('favorites.loadMore', { defaultValue: 'Load more' })}
        </Button>
      )}

    </div>
  );

  return (
    <MobilePageFrame
      tone="canvas"
      appBar={{
        title: t('favorites.title', { defaultValue: 'Favorites' }),
        tone: 'canvas',
        titleAlign: 'start',
        compactLayout: 'leading-only',
        leading: (
          <IconButton aria-label={t('common.previous', { defaultValue: 'Back' })} onClick={() => navigate('/profile')} className="text-text hover:text-text">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={1.7} />
          </IconButton>
        ),
      }}
      contentId="favorites-content"
      contentLabel={t('favorites.title', { defaultValue: 'Favorites' })}
      contentEndInset={!showEmptyState}
      contentClassName={showEmptyState
        ? 'flex flex-col bg-[#efebf6] max-md:pt-0'
        : 'flex flex-col bg-[#efebf6]'}
    >
      {content}
    </MobilePageFrame>
  );
}

export const Favorites = FavoritesPage;
