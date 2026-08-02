import { useEffect, useState } from 'react';
import { getFeaturedTerms } from '../../../api/terms';
import type { FeaturedTerm } from '../../../types';
import type { FeaturedTermCardVariant } from './FeaturedTermCard';
import { FEATURED_TERMS_LIMIT, TermCardCarouselView } from './TermCardCarouselView';

export function TermCardCarousel({ variant = 'desktop' }: { variant?: FeaturedTermCardVariant }) {
  const [terms, setTerms] = useState<FeaturedTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const loadTerms = () => setRequestVersion((value) => value + 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getFeaturedTerms(FEATURED_TERMS_LIMIT)
      .then((data) => { if (!cancelled) setTerms(data); })
      .catch(() => { if (!cancelled) { setTerms([]); setError(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [variant, requestVersion]);

  return <TermCardCarouselView terms={terms} loading={loading} error={error} onRetry={loadTerms} variant={variant} />;
}
