import { createContext, useContext, type PropsWithChildren } from 'react';
import { apiClient } from '../../../api/client';

export type SearchRequestClient = Pick<typeof apiClient, 'get'>;
type SearchRequestContextValue = {
  client: SearchRequestClient;
  refreshKey: number;
  locale?: string;
};

const SearchRequestClientContext = createContext<SearchRequestContextValue>({
  client: apiClient,
  refreshKey: 0,
});

export function SearchRequestClientProvider({
  client,
  refreshKey = 0,
  locale,
  children,
}: PropsWithChildren<{ client: SearchRequestClient; refreshKey?: number; locale?: string }>) {
  return (
    <SearchRequestClientContext.Provider value={{ client, refreshKey, locale }}>
      {children}
    </SearchRequestClientContext.Provider>
  );
}

export function useSearchRequestClient() {
  return useContext(SearchRequestClientContext).client;
}

export function useSearchRequestContext() {
  return useContext(SearchRequestClientContext);
}
