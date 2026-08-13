export const SEARCH_FILTER_CATEGORY_ORDER = ['ent', 'book', 'grade', 'section'] as const;

export type SearchFilterCategoryId = (typeof SEARCH_FILTER_CATEGORY_ORDER)[number];
export type SearchFilterActivationOrder = SearchFilterCategoryId[];

export interface ActiveSearchFilterCategories {
  entOnly: boolean;
  selections: {
    book: readonly string[];
    grade: readonly string[];
    section: readonly string[];
  };
}

function isSearchFilterCategoryId(value: unknown): value is SearchFilterCategoryId {
  return SEARCH_FILTER_CATEGORY_ORDER.includes(value as SearchFilterCategoryId);
}

function categoryIsActive(
  category: SearchFilterCategoryId,
  active: ActiveSearchFilterCategories,
): boolean {
  return category === 'ent' ? active.entOnly : active.selections[category].length > 0;
}

export function normalizeSearchFilterActivationOrder(
  order: readonly unknown[] | undefined,
  active: ActiveSearchFilterCategories,
): SearchFilterActivationOrder {
  const normalized: SearchFilterActivationOrder = [];
  const appendIfActive = (category: SearchFilterCategoryId) => {
    if (categoryIsActive(category, active) && !normalized.includes(category)) normalized.push(category);
  };

  order?.forEach((category) => {
    if (isSearchFilterCategoryId(category)) appendIfActive(category);
  });
  SEARCH_FILTER_CATEGORY_ORDER.forEach(appendIfActive);
  return normalized;
}

export function updateSearchFilterActivationOrder(
  order: readonly SearchFilterCategoryId[],
  category: SearchFilterCategoryId,
  active: boolean,
): SearchFilterActivationOrder {
  const withoutCategory = order.filter((item) => item !== category);
  if (!active) return withoutCategory;
  return order.includes(category) ? [...order] : [...order, category];
}
