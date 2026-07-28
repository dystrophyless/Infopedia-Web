import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getTerm } from '../api/terms';
import { TermDetailView, type RelatedTerm, type TermDetailLoadState } from '../features/terms/components/TermDetailView';
import { useAuthStore } from '../stores/authStore';
import type { Term } from '../types';
import { useMobileBottomNavDecision } from '../features/navigation';

interface TermDetailState {
  backTo?: string;
  term?: Term;
  selectedDefinitionPublicId?: string;
  relatedTerms?: RelatedTerm[];
}

/** Route/API container. All visual and definition-selection behavior lives in TermDetailView. */
export function TermDetail() {
  const { termRef } = useParams<{ termRef: string }>();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const decision = useMobileBottomNavDecision();
  const state = (location.state as TermDetailState | null) ?? null;
  const routeStateTerm = state?.term;
  const stateTerm = routeStateTerm?.public_id === termRef ? routeStateTerm : null;
  const [fetchedTerm, setFetchedTerm] = useState<Term | null>(null);
  const [loadState, setLoadState] = useState<TermDetailLoadState>('idle');

  useEffect(() => {
    if (!termRef || stateTerm) return;
    let cancelled = false;
    setLoadState('loading');
    getTerm(termRef)
      .then((term) => {
        if (cancelled) return;
        setFetchedTerm(term);
        setLoadState('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedTerm(null);
        setLoadState('error');
      });
    return () => { cancelled = true; };
  }, [termRef, stateTerm]);

  return (
    <TermDetailView
      term={stateTerm ?? fetchedTerm}
      loadState={loadState}
      backTo={state?.backTo ?? (isAuthenticated ? '/search' : '/')}
      bottomNavVisible={decision.visible}
      relatedTerms={state?.relatedTerms}
      selectedDefinitionPublicId={state?.selectedDefinitionPublicId}
    />
  );
}
