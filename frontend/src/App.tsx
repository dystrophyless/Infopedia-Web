import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { RootEntry } from './components/RootEntry';
import { useAuthStore } from './stores/authStore';
import { useFavoritesStore } from './features/favorites/model';
import { DocumentSeo } from './seo/DocumentSeo';

const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then((module) => ({ default: module.Register })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((module) => ({ default: module.ResetPassword })));
const GoogleCallback = lazy(() => import('./pages/GoogleCallback').then((module) => ({ default: module.GoogleCallback })));
const Onboarding = lazy(() => import('./pages/Onboarding').then((module) => ({ default: module.Onboarding })));
const TermSearch = lazy(() => import('./pages/TermSearch').then((module) => ({ default: module.TermSearch })));
const SearchFilters = lazy(() => import('./pages/SearchFilters').then((module) => ({ default: module.SearchFilters })));
const TermDetail = lazy(() => import('./pages/TermDetail').then((module) => ({ default: module.TermDetail })));
const Tests = lazy(() => import('./pages/Tests').then((module) => ({ default: module.Tests })));
const TestQuestionPage = lazy(() => import('./pages/TestQuestionPage').then((module) => ({ default: module.TestQuestionPage })));
const PracticeByTopicPage = lazy(() => import('./pages/PracticeByTopicPage').then((module) => ({ default: module.PracticeByTopicPage })));
const Analyze = lazy(() => import('./pages/Analyze').then((module) => ({ default: module.Analyze })));
const Profile = lazy(() => import('./pages/Profile').then((module) => ({ default: module.Profile })));
const Favorites = lazy(() => import('./pages/Favorites').then((module) => ({ default: module.Favorites })));
const Subscription = lazy(() => import('./pages/Subscription').then((module) => ({ default: module.Subscription })));
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })));

function RouteLoading() {
  const { t } = useTranslation();

  return (
    <div role="status" aria-live="polite" className="flex min-h-[240px] items-center justify-center p-6 text-[16px] text-muted">
      {t('common.loading')}
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>
        <Suspense fallback={<RouteLoading />}>{children}</Suspense>
      </Layout>
    </ProtectedRoute>
  );
}

function Public({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      <Suspense fallback={<RouteLoading />}>{children}</Suspense>
    </Layout>
  );
}

export default function App() {
  const ownerUserId = useAuthStore((state) => state.user?.id ?? null);
  const favoritesOwnerUserId = useFavoritesStore((state) => state.ownerUserId);
  const setOwnerUserId = useFavoritesStore((state) => state.setOwnerUserId);

  useEffect(() => {
    setOwnerUserId(ownerUserId);
  }, [ownerUserId, setOwnerUserId]);

  // Keep every route, including public term details, from mounting against
  // another user's cached favorite state while ownership is synchronized.
  // Both values start as null for an unauthenticated/loading session, so the
  // initial render is not blocked and the effect can establish the next owner.
  const ownerReady = favoritesOwnerUserId === ownerUserId;
  if (!ownerReady) return null;

  return (
    <BrowserRouter>
      <DocumentSeo />
      <Routes>
        <Route path="/login" element={<Suspense fallback={<RouteLoading />}><Login /></Suspense>} />
        <Route path="/register" element={<Suspense fallback={<RouteLoading />}><Register /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<RouteLoading />}><ForgotPassword /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<RouteLoading />}><ResetPassword /></Suspense>} />
        <Route path="/auth/google/callback" element={<Suspense fallback={<RouteLoading />}><GoogleCallback /></Suspense>} />
        <Route path="/onboarding" element={<Suspense fallback={<RouteLoading />}><Onboarding /></Suspense>} />

        <Route
          path="/"
          element={
            <Public>
              <RootEntry />
            </Public>
          }
        />
        <Route
          path="/search"
          element={
            <Protected>
              <TermSearch />
            </Protected>
          }
        />
        <Route
          path="/search/filters"
          element={
            <Protected>
              <SearchFilters />
            </Protected>
          }
        />
        <Route
          path="/terms/:termRef"
          element={
            <Public>
              <TermDetail />
            </Public>
          }
        />
        <Route
          path="/tests/:testMode"
          element={
            <Protected>
              <TestQuestionPage />
            </Protected>
          }
        />
        <Route
          path="/practice-by-topic"
          element={
            <Protected>
              <PracticeByTopicPage />
            </Protected>
          }
        />
        <Route
          path="/tests"
          element={
            <Protected>
              <Tests />
            </Protected>
          }
        />
        <Route
          path="/analyze"
          element={
            <Protected>
              <Analyze />
            </Protected>
          }
        />
        <Route
          path="/profile"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />

        <Route
          path="/favorites"
          element={
            <Protected>
              <Favorites />
            </Protected>
          }
        />
        <Route
          path="/subscription"
          element={
            <Protected>
              <Subscription />
            </Protected>
          }
        />
        <Route path="*" element={<Suspense fallback={<RouteLoading />}><NotFound /></Suspense>} />
      </Routes>
    </BrowserRouter>
  );
}
