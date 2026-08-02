import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  MobileShellProvider,
  resolveDesktopShell,
  useMobileBottomNavDecision,
} from '../features/navigation';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileRouteSplash } from './MobileRouteSplash';
import { Navbar } from './Navbar';

export function Layout({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const authHydrated = useAuthHydration();
  const location = useLocation();
  const desktopShell = resolveDesktopShell(location, isAuthenticated, authHydrated);

  return (
    <MobileShellProvider authenticated={isAuthenticated}>
      <LayoutShell
        authenticated={isAuthenticated}
        authHydrated={authHydrated}
        desktopShell={desktopShell}
        user={user}
      >
        {children}
      </LayoutShell>
    </MobileShellProvider>
  );
}

function useAuthHydration() {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return undefined;
    }

    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

function LayoutShell({
  children,
  authenticated,
  authHydrated,
  desktopShell,
  user,
}: {
  children: ReactNode;
  authenticated: boolean;
  authHydrated: boolean;
  desktopShell: ReturnType<typeof resolveDesktopShell>;
  user: ReturnType<typeof useAuthStore.getState>['user'];
}) {
  const decision = useMobileBottomNavDecision();
  const mobileMainClass = decision.visible
    ? 'max-md:[--mobile-page-available-height:calc(100dvh-var(--shell-mobile-bottom-nav-height))] max-md:[--mobile-page-content-end-inset:var(--mobile-page-content-end-spacing)] max-md:pb-[var(--shell-mobile-bottom-nav-height)]'
    : 'max-md:[--mobile-page-available-height:100dvh] max-md:[--mobile-page-content-end-inset:0px] max-md:pb-0';

  return (
    <div className={`min-h-dvh flex flex-col bg-bg md:min-h-screen ${authenticated ? 'md:flex-row' : ''}`}>
      <MobileRouteSplash />
      {desktopShell.visible && (
        <DesktopSidebar
          activeItem={desktopShell.activeItem}
          user={user}
        />
      )}
      {!authenticated && authHydrated && <Navbar />}
      <main
        className={`flex-1 w-full max-md:min-h-0 max-md:min-w-0 ${mobileMainClass}`}
      >
        {children}
      </main>
      {decision.visible && <MobileBottomNav activeItem={decision.activeItem} />}
    </div>
  );
}
