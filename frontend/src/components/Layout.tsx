import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { MobileShellProvider, useMobileBottomNavDecision } from '../features/navigation';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileRouteSplash } from './MobileRouteSplash';
import { Navbar } from './Navbar';

export function Layout({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <MobileShellProvider authenticated={isAuthenticated}>
      <LayoutShell>{children}</LayoutShell>
    </MobileShellProvider>
  );
}

function LayoutShell({ children }: { children: ReactNode }) {
  const decision = useMobileBottomNavDecision();
  const mobileMainClass = decision.visible
    ? 'max-md:[--mobile-page-available-height:calc(100dvh-var(--shell-mobile-bottom-nav-height))] max-md:pb-[var(--shell-mobile-bottom-nav-height)]'
    : 'max-md:[--mobile-page-available-height:100dvh] max-md:pb-0';

  return (
    <div className="min-h-dvh flex flex-col bg-bg md:min-h-screen">
      <MobileRouteSplash />
      <Navbar />
      <main
        className={`flex-1 w-full max-md:min-h-0 max-md:min-w-0 ${mobileMainClass}`}
      >
        {children}
      </main>
      {decision.visible && <MobileBottomNav activeItem={decision.activeItem} />}
    </div>
  );
}
