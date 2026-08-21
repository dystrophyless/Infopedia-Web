export type MobileBottomNavItem = 'search' | 'tests' | 'analyze' | 'profile';

export type MobileBottomNavOverride = {
  visibility: 'show' | 'hide';
  activeItem?: MobileBottomNavItem | null;
};

export type MobileBottomNavDecision = {
  visible: boolean;
  activeItem: MobileBottomNavItem | null;
};

export type MobileBottomNavLocation = {
  pathname: string;
  search?: string;
};

const HIDDEN_DECISION: MobileBottomNavDecision = { visible: false, activeItem: null };

function visible(activeItem: MobileBottomNavItem): MobileBottomNavDecision {
  return { visible: true, activeItem };
}

function resolveBasePolicy(location: MobileBottomNavLocation): MobileBottomNavDecision {
  const { pathname, search = '' } = location;

  if (pathname === '/search') return visible('search');
  if (pathname === '/search/filters' || pathname.startsWith('/terms/') || pathname === '/practice-by-topic') {
    return HIDDEN_DECISION;
  }
  if (pathname === '/tests') return visible('tests');
  if (pathname.startsWith('/tests/')) return HIDDEN_DECISION;
  if (pathname === '/analyze') {
    return new URLSearchParams(search).get('view') === 'latest' ? visible('profile') : visible('analyze');
  }
  if (pathname === '/profile' || pathname === '/favorites' || pathname === '/subscription') {
    return visible('profile');
  }

  return HIDDEN_DECISION;
}

export function resolveMobileBottomNav(
  location: MobileBottomNavLocation,
  authenticated: boolean,
  override?: MobileBottomNavOverride,
): MobileBottomNavDecision {
  if (!authenticated) return HIDDEN_DECISION;

  const base = resolveBasePolicy(location);
  if (override?.visibility === 'hide') return HIDDEN_DECISION;
  if (override?.visibility === 'show') {
    return { visible: true, activeItem: override.activeItem ?? base.activeItem };
  }
  return base;
}
