import { describe, expect, it } from 'vitest';
import { resolveTermRouteAccess } from './termRouteAccess';

describe('resolveTermRouteAccess', () => {
  it.each([
    [false, 'term-a', 'term-a', 'state'],
    [false, 'term-a', undefined, 'guest-denied'],
    [false, 'term-a', 'term-b', 'guest-denied'],
    [true, 'term-a', 'term-a', 'state'],
    [true, 'term-a', undefined, 'authenticated-fetch'],
    [true, 'term-a', 'term-b', 'authenticated-fetch'],
    [false, undefined, 'term-a', 'guest-denied'],
    [true, undefined, 'term-a', 'guest-denied'],
  ] as const)('resolves auth=%s termRef=%s state=%s to %s', (isAuthenticated, termRef, routeStateTermRef, expected) => {
    expect(resolveTermRouteAccess({ isAuthenticated, termRef, routeStateTermRef })).toBe(expected);
  });
});
