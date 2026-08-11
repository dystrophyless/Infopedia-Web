import { describe, expect, it } from 'vitest';
import {
  createSearchFilterDraft,
  resetSearchFilterDraft,
  searchFilterDraftMatchesCommitted,
  toggleSearchFilterDraftOption,
} from './searchFilterDraft';

const committed = {
  entOnly: true,
  selections: { grade: ['10'], book: ['atamura'], section: [] },
  labels: { grade: { '10': '10 класс' }, book: { atamura: 'Атамұра' }, section: {} },
};

describe('search filter draft', () => {
  it('deep clones committed state so draft mutations cannot leak into Zustand', () => {
    const draft = createSearchFilterDraft(committed);
    const changed = toggleSearchFilterDraftOption(draft, 'grade', '11', '11 класс');

    expect(committed.selections.grade).toEqual(['10']);
    expect(changed.selections.grade).toEqual(['10', '11']);
    expect(searchFilterDraftMatchesCommitted(changed, committed)).toBe(false);
  });

  it('treats identical selection sets as identical regardless of draft ordering', () => {
    const reordered = createSearchFilterDraft({
      ...committed,
      selections: { ...committed.selections, grade: ['11', '10'] },
    });
    const equivalent = toggleSearchFilterDraftOption(reordered, 'grade', '11', '11 класс');
    expect(searchFilterDraftMatchesCommitted(equivalent, committed)).toBe(true);
  });

  it('resets only the local draft', () => {
    expect(resetSearchFilterDraft(createSearchFilterDraft(committed))).toEqual({
      entOnly: false,
      selections: { grade: [], book: [], section: [] },
      labels: { grade: {}, book: {}, section: {} },
    });
    expect(committed.entOnly).toBe(true);
  });
});
