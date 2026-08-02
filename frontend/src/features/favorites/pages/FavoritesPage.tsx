import {
  AllBookmarkIcon,
  ArrowLeft01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import { MobileSearchTermCard } from '../../terms/components/MobileSearchTermCard';
import { TermCard } from '../../terms/components/TermCard';
import { useFavoritesStore } from '../model';

const PAGE_SIZE = 20;

function getRelatedTerms(term: Term, terms: Term[]): Pick<Term, 'public_id' | 'name'>[] {
  return terms
    .filter((candidate) => candidate.public_id !== term.public_id)
    .slice(0, 2)
    .map(({ public_id, name }) => ({ public_id, name }));
}

export function FavoritesContent({
  embedded = false,
  detailBackTo = '/favorites',
}: {
  embedded?: boolean;
  detailBackTo?: string;
}) {
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
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  useEffect(() => {
    setOwnerUserId(ownerUserId);
  }, [ownerUserId, setOwnerUserId]);

  useEffect(() => {
    if (selectedTermId && !list.some((term) => term.public_id === selectedTermId)) setSelectedTermId(null);
  }, [list, selectedTermId]);

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
      className={embedded
        ? 'flex h-[416px] min-h-[416px] max-h-[416px] w-full flex-col overflow-hidden'
        : showEmptyState
          ? 'flex w-full flex-1 flex-col md:mx-auto md:max-w-[760px] md:px-8 md:pb-16 md:pt-12'
          : 'mx-auto w-full max-w-[760px] px-4 pb-8 md:px-8 md:pb-16 md:pt-12'}
    >
      {!embedded && <header className="mb-6 hidden md:block">
        <h1 className="text-[38px] font-medium leading-none text-text">
          {t('favorites.title', { defaultValue: 'Favorites' })}
        </h1>
        <p className="mt-3 text-[16px] text-muted">
          {t('favorites.subtitle', { defaultValue: 'Terms you saved for later' })}
        </p>
      </header>}

      {isLoading && list.length === 0 && (
        <>
          <div className={embedded ? 'hidden min-h-0 flex-1 space-y-4 overflow-y-auto md:block' : 'hidden space-y-4 md:block'} aria-label="Loading favorites" role="status">
            {Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} />)}
          </div>
          <div className="hidden space-y-4 max-md:-mx-[2px] max-md:block max-md:w-[calc(100%+4px)]" aria-label="Loading favorites" role="status">
            {Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} variant="mobile-term-card" />)}
          </div>
        </>
      )}

      {!isLoading && error && list.length === 0 && (
        embedded ? (
          <BetweenBlocks className="flex min-h-0 flex-1 items-center justify-center px-6">
            <section className="rounded-[8px] bg-white p-8 text-center" role="alert">
              <Text tone="danger" className="text-[16px]">
                {t('favorites.loadError', { defaultValue: 'Unable to load favorites.' })}
              </Text>
              <Button className="mt-5" onClick={retry}>
                {t('common.retry', { defaultValue: 'Retry' })}
              </Button>
            </section>
          </BetweenBlocks>
        ) : (
          <section className="rounded-[8px] bg-white p-8 text-center" role="alert">
            <Text tone="danger" className="text-[16px]">
              {t('favorites.loadError', { defaultValue: 'Unable to load favorites.' })}
            </Text>
            <Button className="mt-5" onClick={retry}>
              {t('common.retry', { defaultValue: 'Retry' })}
            </Button>
          </section>
        )
      )}

      {showEmptyState && (
        <BetweenBlocks
          data-mobile-outcome-slot
          className="min-h-0 flex-1 px-6 md:flex md:items-center md:justify-center md:px-6"
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

      {(list.length > 0 || (error && list.length > 0) || hasMore) && (
        <div className={embedded ? 'min-h-0 flex-1 overflow-y-auto' : 'contents'}>
          {list.length > 0 && <>
          <p className="mb-4 text-[16px] font-normal leading-none text-[#514b5c] md:hidden">
            {t('favorites.count', { count: total, defaultValue: `${total}` })}
          </p>
          <div className="hidden flex-col gap-4 md:flex" aria-label={t('favorites.listLabel', { defaultValue: 'Favorite terms' })}>
            {list.map((term) => (
              <TermCard
                key={term.public_id}
                term={term}
                relatedTerms={getRelatedTerms(term, list)}
                backTo={detailBackTo}
                selected={selectedTermId === term.public_id}
                onSelectedChange={(nextSelected) => setSelectedTermId(nextSelected ? term.public_id : null)}
              />
            ))}
          </div>
          <div className="hidden flex-col gap-4 max-md:-mx-[2px] max-md:flex max-md:w-[calc(100%+4px)]" aria-label={t('favorites.listLabel', { defaultValue: 'Favorite terms' })}>
            {list.map((term) => (
              <MobileSearchTermCard
                key={term.public_id}
                term={term}
                relatedTerms={getRelatedTerms(term, list)}
                backTo={detailBackTo}
              />
            ))}
          </div>
          </>}

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
      )}
    </div>
  );

  return embedded ? content : (
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

export function FavoritesPage() {
  return <FavoritesContent />;
}

export const Favorites = FavoritesPage;
