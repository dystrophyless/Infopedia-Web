import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  resolveMobileBottomNav,
  type MobileBottomNavDecision,
  type MobileBottomNavOverride,
} from './model/mobileBottomNavPolicy';

type MobileShellRegistration = {
  routeKey: string;
  override: MobileBottomNavOverride;
  token: symbol;
};

type MobileShellContextValue = {
  decision: MobileBottomNavDecision;
  registerOverride: (routeKey: string, override?: MobileBottomNavOverride) => () => void;
};

const defaultDecision: MobileBottomNavDecision = { visible: false, activeItem: null };
const defaultContext: MobileShellContextValue = {
  decision: defaultDecision,
  registerOverride: () => () => undefined,
};
const MobileShellContext = createContext<MobileShellContextValue>(defaultContext);

function getRouteKey(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export function MobileShellProvider({ authenticated, children }: { authenticated: boolean; children: ReactNode }) {
  const location = useLocation();
  const [registrations, setRegistrations] = useState<MobileShellRegistration[]>([]);

  const registerOverride = useCallback((routeKey: string, override?: MobileBottomNavOverride) => {
    const token = Symbol('mobile-shell-registration');
    setRegistrations((current) => {
      const withoutCurrentRoute = current.filter((registration) => registration.routeKey !== routeKey);
      return override ? [...withoutCurrentRoute, { routeKey, override, token }] : withoutCurrentRoute;
    });

    return () => {
      setRegistrations((current) => current.filter((registration) => registration.token !== token));
    };
  }, []);

  const routeKey = getRouteKey(location.pathname, location.search);
  const registration = registrations.find((candidate) => candidate.routeKey === routeKey);
  const decision = useMemo(
    () => resolveMobileBottomNav(location, authenticated, registration?.override),
    [authenticated, location.pathname, location.search, registration?.override],
  );
  const contextValue = useMemo(
    () => ({ decision, registerOverride }),
    [decision, registerOverride],
  );

  return <MobileShellContext.Provider value={contextValue}>{children}</MobileShellContext.Provider>;
}

export function useMobileBottomNavDecision(): MobileBottomNavDecision {
  return useContext(MobileShellContext).decision;
}

export function useMobileBottomNavOverride(override?: MobileBottomNavOverride): MobileBottomNavDecision {
  const location = useLocation();
  const { registerOverride, decision } = useContext(MobileShellContext);
  const routeKey = getRouteKey(location.pathname, location.search);

  useLayoutEffect(
    () => registerOverride(routeKey, override),
    [override?.activeItem, override?.visibility, registerOverride, routeKey],
  );

  return decision;
}
