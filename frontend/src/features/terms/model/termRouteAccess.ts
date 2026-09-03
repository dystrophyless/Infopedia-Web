export type TermRouteAccess = 'state' | 'authenticated-fetch' | 'guest-denied';

export function resolveTermRouteAccess(input: {
  isAuthenticated: boolean;
  termRef: string | undefined;
  routeStateTermRef: string | undefined;
}): TermRouteAccess {
  if (!input.termRef) return 'guest-denied';
  if (input.isAuthenticated) return 'authenticated-fetch';
  return input.routeStateTermRef === input.termRef ? 'state' : 'guest-denied';
}
