import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileRouteSplash } from './MobileRouteSplash';
import { Navbar } from './Navbar';

export function Layout({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <MobileRouteSplash />
      <Navbar />
      <main
        className={`flex-1 w-full max-md:min-w-0 ${
          isAuthenticated ? 'max-md:pb-[calc(88px+env(safe-area-inset-bottom,0px))]' : ''
        }`}
      >
        {children}
      </main>
      {isAuthenticated && <MobileBottomNav />}
    </div>
  );
}
