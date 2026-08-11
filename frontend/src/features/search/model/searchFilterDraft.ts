import type {
  SearchFilterSelectionLabels,
  SearchFilterSelections,
  SearchFilterSelectId,
} from './searchStore';

export interface SearchFilterSnapshot {
  entOnly: boolean;
  selections: SearchFilterSelections;
  labels: SearchFilterSelectionLabels;
}

export type SearchFilterDraft = SearchFilterSnapshot;

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
  };
}

export function resetSearchFilterDraft(_: SearchFilterDraft): SearchFilterDraft {
  return {
    entOnly: false,
    selections: { grade: [], book: [], section: [] },
    labels: { grade: {}, book: {}, section: {} },
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

  return {
    ...draft,
    selections: {
      ...draft.selections,
      [filterId]: isSelected
        ? selectedIds.filter((selectedId) => selectedId !== optionId)
        : [...selectedIds, optionId],
    },
    labels: { ...draft.labels, [filterId]: labels },
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
  };
}

function sameIds(left: readonly string[], right: readonly string[]) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}

export function searchFilterDraftMatchesCommitted(
  draft: SearchFilterDraft,
  committed: SearchFilterSnapshot,
): boolean {
  return (
    draft.entOnly === committed.entOnly &&
    sameIds(draft.selections.grade, committed.selections.grade) &&
    sameIds(draft.selections.book, committed.selections.book) &&
    sameIds(draft.selections.section, committed.selections.section)
  );
}
