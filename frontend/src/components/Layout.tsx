import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileRouteSplash } from './MobileRouteSplash';
import { Navbar } from './Navbar';

export function Layout({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-dvh flex flex-col bg-bg md:min-h-screen">
      <MobileRouteSplash />
      <Navbar />
      <main
        className={`flex-1 w-full max-md:min-h-0 max-md:min-w-0 ${
          isAuthenticated
            ? 'max-md:[--mobile-page-available-height:calc(100dvh-var(--shell-mobile-bottom-nav-height))] max-md:pb-[var(--shell-mobile-bottom-nav-height)]'
            : ''
        }`}
      >
        {children}
      </main>
      {isAuthenticated && <MobileBottomNav />}
    </div>
  );
}
