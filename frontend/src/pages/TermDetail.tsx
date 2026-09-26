import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { getRelatedTermsForDefinition, getTerm, type RelatedTerm } from '../api/terms';
import { TermDetailView, type TermDetailLoadState } from '../features/terms/components/TermDetailView';
import { useAuthStore } from '../stores/authStore';
import type { Term } from '../types';
import { useMobileBottomNavDecision } from '../features/navigation';
import { resolveTermRouteAccess, type TermRouteAccess } from '../features/terms/model';

interface TermDetailState {
  backTo?: string;
  term?: Term;
  selectedDefinitionPublicId?: string;
}

interface RelatedTermsState {
  requestKey: string | null;
  items: RelatedTerm[];
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
  const [activeDefinitionRef, setActiveDefinitionRef] = useState<string | null>(
    state?.selectedDefinitionPublicId ?? null,
  );
  const [relatedTermsState, setRelatedTermsState] = useState<RelatedTermsState>({ requestKey: null, items: [] });
  const relatedGeneration = useRef(0);

  useEffect(() => {
    if (routeAccess !== 'authenticated-fetch' || !termRef) return;
    let cancelled = false;
    setLoadState('loading');
    setFetchedTerm(null);
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

  const fetchedMatches = fetchedTerm?.public_id === termRef ? fetchedTerm : null;
  const term = routeAccess === 'authenticated-fetch'
    ? (fetchedMatches ?? stateTerm)
    : stateTerm;

  useEffect(() => {
    const definitions = term?.definitions ?? [];
    const selected = state?.selectedDefinitionPublicId;
    const selectedExists = selected
      ? definitions.some((definition) => definition.public_id === selected)
      : false;
    if (selected && !selectedExists && routeAccess === 'authenticated-fetch' && loadState !== 'error' && fetchedTerm === null) {
      setActiveDefinitionRef(selected);
      return;
    }
    setActiveDefinitionRef(selectedExists ? selected ?? null : definitions[0]?.public_id ?? null);
  }, [fetchedTerm, loadState, routeAccess, state?.selectedDefinitionPublicId, term]);

  const relatedDefinitionRef = term && term.public_id === termRef
    && activeDefinitionRef
    && term.definitions?.some((definition) => definition.public_id === activeDefinitionRef)
    ? activeDefinitionRef
    : null;
  const relatedRequestKey = isAuthenticated && termRef && relatedDefinitionRef
    ? JSON.stringify([termRef, relatedDefinitionRef])
    : null;
  const hasCurrentRelatedTerms = relatedRequestKey !== null && relatedTermsState.requestKey === relatedRequestKey;
  const relatedTerms = hasCurrentRelatedTerms ? relatedTermsState.items : [];
  const relatedTermsLoading = relatedRequestKey !== null && !hasCurrentRelatedTerms;

  useEffect(() => {
    const generation = ++relatedGeneration.current;
    if (!isAuthenticated || !termRef || !relatedDefinitionRef || !relatedRequestKey) {
      setRelatedTermsState({ requestKey: null, items: [] });
      return;
    }

    const controller = new AbortController();
    getRelatedTermsForDefinition(termRef, relatedDefinitionRef, controller.signal)
      .then((items) => {
        if (controller.signal.aborted || generation !== relatedGeneration.current) return;
        setRelatedTermsState({ requestKey: relatedRequestKey, items });
      })
      .catch(() => {
        if (controller.signal.aborted || generation !== relatedGeneration.current) return;
        setRelatedTermsState({ requestKey: relatedRequestKey, items: [] });
      });
    return () => controller.abort();
  }, [activeDefinitionRef, isAuthenticated, relatedDefinitionRef, relatedRequestKey, term, termRef]);

  return (
    <TermDetailView
      term={term}
      loadState={loadState}
      backTo={state?.backTo ?? (isAuthenticated ? '/search' : '/')}
      bottomNavVisible={bottomNavVisible}
      relatedTerms={relatedTerms}
      relatedTermsLoading={relatedTermsLoading}
      selectedDefinitionPublicId={activeDefinitionRef ?? undefined}
      onDefinitionChange={setActiveDefinitionRef}
    />
  );
}
