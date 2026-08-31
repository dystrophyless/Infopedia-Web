import { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { getTerm } from '../api/terms';
import { TermDetailView, type RelatedTerm, type TermDetailLoadState } from '../features/terms/components/TermDetailView';
import { useAuthStore } from '../stores/authStore';
import type { Term } from '../types';
import { useMobileBottomNavDecision } from '../features/navigation';
import { resolveTermRouteAccess, type TermRouteAccess } from '../features/terms/model';

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
  const stateTerm = routeStateTerm?.public_id === termRef ? routeStateTerm ?? null : null;
  const routeAccess = resolveTermRouteAccess({
    isAuthenticated,
    termRef,
    routeStateTermRef: routeStateTerm?.public_id,
  });

  if (routeAccess === 'guest-denied') {
    return <Navigate to="/" replace />;
  }

  return (
    <TermDetailContent
      termRef={termRef}
      state={state}
      stateTerm={stateTerm}
      routeAccess={routeAccess}
      isAuthenticated={isAuthenticated}
      bottomNavVisible={decision.visible}
    />
  );
}

function TermDetailContent({
  termRef,
  state,
  stateTerm,
  routeAccess,
  isAuthenticated,
  bottomNavVisible,
}: {
  termRef: string | undefined;
  state: TermDetailState | null;
  stateTerm: Term | null;
  routeAccess: TermRouteAccess;
  isAuthenticated: boolean;
  bottomNavVisible: boolean;
}) {
  const [fetchedTerm, setFetchedTerm] = useState<Term | null>(null);
  const [loadState, setLoadState] = useState<TermDetailLoadState>('idle');

  useEffect(() => {
    if (routeAccess !== 'authenticated-fetch' || !termRef) return;
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
  }, [routeAccess, termRef]);

  return (
    <TermDetailView
      term={stateTerm ?? fetchedTerm}
      loadState={loadState}
      backTo={state?.backTo ?? (isAuthenticated ? '/search' : '/')}
      bottomNavVisible={bottomNavVisible}
      relatedTerms={state?.relatedTerms}
      selectedDefinitionPublicId={state?.selectedDefinitionPublicId}
    />
  );
}
