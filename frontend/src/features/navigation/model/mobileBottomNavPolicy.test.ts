import { describe, expect, it } from 'vitest';
import { resolveMobileBottomNav } from './mobileBottomNavPolicy';

const location = (pathname: string, search = '') => ({ pathname, search });

describe('resolveMobileBottomNav', () => {
  it.each([
    ['/search', 'search'],
    ['/tests', 'tests'],
    ['/analyze', 'analyze'],
    ['/analyze?view=latest', 'profile'],
    ['/profile', 'profile'],
    ['/favorites', 'profile'],
    ['/subscription', 'profile'],
  ])('shows the active primary item for %s', (pathname, activeItem) => {
    const [path, query = ''] = pathname.split('?');
    expect(resolveMobileBottomNav(location(path, query ? `?${query}` : ''), true)).toEqual({
      visible: true,
      activeItem,
    });
  });

  it.each(['/search/filters', '/terms/recursion', '/tests/default', '/practice-by-topic', '/', '/unknown'])(
    'hides shell chrome for nested or non-primary route %s',
    (pathname) => {
      expect(resolveMobileBottomNav(location(pathname), true)).toEqual({
        visible: false,
        activeItem: null,
      });
    },
  );

  it('compares /tests exactly and never marks a test session as the hub', () => {
    expect(resolveMobileBottomNav(location('/tests'), true)).toEqual({ visible: true, activeItem: 'tests' });
    expect(resolveMobileBottomNav(location('/tests/default'), true)).toEqual({ visible: false, activeItem: null });
  });

  it('hides the shell for unauthenticated locations', () => {
    expect(resolveMobileBottomNav(location('/search'), false)).toEqual({ visible: false, activeItem: null });
  });

  it('lets a ready practice owner show the Tests item', () => {
    expect(resolveMobileBottomNav(location('/practice-by-topic'), true, { visibility: 'show', activeItem: 'tests' })).toEqual({
      visible: true,
      activeItem: 'tests',
    });
  });

  it('always clears active item when an override hides chrome', () => {
    expect(resolveMobileBottomNav(location('/search'), true, { visibility: 'hide', activeItem: 'tests' })).toEqual({
      visible: false,
      activeItem: null,
    });
  });
});
