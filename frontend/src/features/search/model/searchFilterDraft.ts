import type {
  SearchFilterSelectionLabels,
  SearchFilterSelections,
  SearchFilterSelectId,
} from './searchStore';
import {
  normalizeSearchFilterActivationOrder,
  updateSearchFilterActivationOrder,
  type SearchFilterActivationOrder,
} from './searchFilterActivationOrder';

export interface SearchFilterSnapshot {
  entOnly: boolean;
  selections: SearchFilterSelections;
  labels: SearchFilterSelectionLabels;
  activationOrder?: readonly SearchFilterActivationOrder[number][];
}

export type SearchFilterDraft = Omit<SearchFilterSnapshot, 'activationOrder'> & {
  activationOrder: SearchFilterActivationOrder;
};

function cloneSelections(selections: SearchFilterSelections): SearchFilterSelections {
  return {
    grade: [...selections.grade],
    book: [...selections.book],
    section: [...selections.section],
  };
}

function cloneLabels(labels: SearchFilterSelectionLabels): SearchFilterSelectionLabels {
  return {
    grade: { ...labels.grade },
    book: { ...labels.book },
    section: { ...labels.section },
  };
}

export function createSearchFilterDraft(snapshot: SearchFilterSnapshot): SearchFilterDraft {
  return {
    entOnly: snapshot.entOnly,
    selections: cloneSelections(snapshot.selections),
    labels: cloneLabels(snapshot.labels),
    activationOrder: normalizeSearchFilterActivationOrder(snapshot.activationOrder, snapshot),
  };
}

export function resetSearchFilterDraft(_: SearchFilterDraft): SearchFilterDraft {
  return {
    entOnly: false,
    selections: { grade: [], book: [], section: [] },
    labels: { grade: {}, book: {}, section: {} },
    activationOrder: [],
  };
}

export function toggleSearchFilterDraftOption(
  draft: SearchFilterDraft,
  filterId: SearchFilterSelectId,
  optionId: string,
  optionLabel?: string,
): SearchFilterDraft {
  const selectedIds = draft.selections[filterId];
  const isSelected = selectedIds.includes(optionId);
  const labels = { ...draft.labels[filterId] };
  if (isSelected) delete labels[optionId];
  else if (optionLabel) labels[optionId] = optionLabel;

  const nextSelections = {
    ...draft.selections,
    [filterId]: isSelected
      ? selectedIds.filter((selectedId) => selectedId !== optionId)
      : [...selectedIds, optionId],
  };

  return {
    ...draft,
    selections: nextSelections,
    labels: { ...draft.labels, [filterId]: labels },
    activationOrder: updateSearchFilterActivationOrder(
      draft.activationOrder,
      filterId,
      nextSelections[filterId].length > 0,
    ),
  };
}

export function setSearchFilterDraftEntOnly(
  draft: SearchFilterDraft,
  entOnly: boolean,
): SearchFilterDraft {
  return {
    ...draft,
    entOnly,
    activationOrder: updateSearchFilterActivationOrder(draft.activationOrder, 'ent', entOnly),
  };
}

export function removeSearchFilterDraftOption(
  draft: SearchFilterDraft,
  filterId: SearchFilterSelectId,
  optionId: string,
): SearchFilterDraft {
  if (!draft.selections[filterId].includes(optionId)) return draft;
  return toggleSearchFilterDraftOption(draft, filterId, optionId);
}

export function resetSearchFilterDraftOptions(
  draft: SearchFilterDraft,
  filterId: SearchFilterSelectId,
): SearchFilterDraft {
  return {
    ...draft,
    selections: { ...draft.selections, [filterId]: [] },
    labels: { ...draft.labels, [filterId]: {} },
    activationOrder: updateSearchFilterActivationOrder(draft.activationOrder, filterId, false),
  };
}

function sameIds(left: readonly string[], right: readonly string[]) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}

function sameOrder(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function searchFilterDraftMatchesCommitted(
  draft: SearchFilterSnapshot,
  committed: SearchFilterSnapshot,
): boolean {
  const draftOrder = normalizeSearchFilterActivationOrder(draft.activationOrder, draft);
  const committedOrder = normalizeSearchFilterActivationOrder(committed.activationOrder, committed);
  return (
    draft.entOnly === committed.entOnly &&
    sameIds(draft.selections.grade, committed.selections.grade) &&
    sameIds(draft.selections.book, committed.selections.book) &&
    sameIds(draft.selections.section, committed.selections.section) &&
    sameOrder(draftOrder, committedOrder)
  );
}
