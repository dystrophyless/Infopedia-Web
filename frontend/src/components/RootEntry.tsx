import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Landing } from '../pages/Landing';
import { useAuthStore } from '../stores/authStore';

const MOBILE_QUERY = '(max-width: 767px)';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

export function RootEntry() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isMobile = useIsMobile();

  if (isAuthenticated && isMobile) {
    return <Navigate to="/search" replace />;
  }

  return <Landing />;
}
