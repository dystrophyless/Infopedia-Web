import { useEffect, useState } from 'react';
import { getFeaturedTerms } from '../../../api/terms';
import type { FeaturedTerm } from '../../../types';
import type { FeaturedTermCardVariant } from './FeaturedTermCard';
import { FEATURED_TERMS_LIMIT, TermCardCarouselView } from './TermCardCarouselView';

export function TermCardCarousel({ variant = 'desktop' }: { variant?: FeaturedTermCardVariant }) {
  const [terms, setTerms] = useState<FeaturedTerm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFeaturedTerms(FEATURED_TERMS_LIMIT)
      .then((data) => { if (!cancelled) setTerms(data); })
      .catch(() => { if (!cancelled) setTerms([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [variant]);

  return <TermCardCarouselView terms={terms} loading={loading} variant={variant} />;
}
