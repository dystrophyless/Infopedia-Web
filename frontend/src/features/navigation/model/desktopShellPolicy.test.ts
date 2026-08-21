import { describe, expect, it } from 'vitest';
import { resolveDesktopShell } from './desktopShellPolicy';

describe('resolveDesktopShell', () => {
  it('keeps the desktop shell hidden until auth persistence has hydrated', () => {
    expect(resolveDesktopShell({ pathname: '/tests' }, true, false)).toEqual({
      visible: false,
      activeItem: null,
    });
  });

  it('keeps the guest desktop shell on the public navbar', () => {
    expect(resolveDesktopShell({ pathname: '/' }, false, true)).toEqual({
      visible: false,
      activeItem: null,
    });
  });

  it.each([
    ['/', 'home'],
    ['/tests', 'tests'],
    ['/tests/quick', 'tests'],
    ['/practice-by-topic', 'tests'],
    ['/search', 'search'],
    ['/search/filters', 'search'],
    ['/terms/python', 'search'],
    ['/analyze', 'analyze'],
  ] as const)('maps %s to the %s item for authenticated users', (pathname, activeItem) => {
    expect(resolveDesktopShell({ pathname }, true, true)).toEqual({
      visible: true,
      activeItem,
    });
  });

  it('maps the profile route to the profile sidebar item for authenticated users', () => {
    expect(resolveDesktopShell({ pathname: '/profile' }, true, true)).toEqual({
      visible: true,
      activeItem: 'profile',
    });
  });
});
