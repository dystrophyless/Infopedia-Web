export function shouldReplaceSearchRequest(
  previousKey: string | null,
  nextKey: string,
  retry: boolean,
): boolean {
  return retry || previousKey !== nextKey;
}

export type SearchLoadMoreAction =
  | { type: 'reveal'; nextVisible: number }
  | { type: 'append'; skip: number }
  | { type: 'none' };

export function chooseSearchLoadMoreAction({
  visible,
  loaded,
  hasMore,
}: {
  visible: number;
  loaded: number;
  hasMore: boolean;
}): SearchLoadMoreAction {
  if (visible < loaded) return { type: 'reveal', nextVisible: Math.min(visible + 4, loaded) };
  if (hasMore) return { type: 'append', skip: loaded };
  return { type: 'none' };
}
