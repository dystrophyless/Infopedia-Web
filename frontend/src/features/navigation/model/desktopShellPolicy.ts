export type DesktopShellItem = 'home' | 'tests' | 'search' | 'analyze' | 'algosha' | 'profile';

export type DesktopShellLocation = {
  pathname: string;
};

export type DesktopShellDecision = {
  visible: boolean;
  activeItem: DesktopShellItem | null;
};

const HIDDEN_DECISION: DesktopShellDecision = { visible: false, activeItem: null };

function activeItemForPath(pathname: string): DesktopShellItem | null {
  if (pathname === '/') return 'home';
  if (
    pathname === '/tests' ||
    pathname.startsWith('/tests/') ||
    pathname === '/practice-by-topic'
  ) {
    return 'tests';
  }
  if (
    pathname === '/search' ||
    pathname === '/search/filters' ||
    pathname === '/semantic-search' ||
    pathname.startsWith('/terms/')
  ) {
    return 'search';
  }
  if (pathname === '/analyze') return 'analyze';
  if (pathname === '/profile') return 'profile';
  return null;
}

export function resolveDesktopShell(
  location: DesktopShellLocation,
  authenticated: boolean,
  hydrated: boolean,
): DesktopShellDecision {
  if (!hydrated || !authenticated) return HIDDEN_DECISION;
  if (location.pathname === '/subscription') return HIDDEN_DECISION;
  return { visible: true, activeItem: activeItemForPath(location.pathname) };
}
