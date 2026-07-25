import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { RootEntry } from './components/RootEntry';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { GoogleCallback } from './pages/GoogleCallback';
import { Onboarding } from './pages/Onboarding';
import { ResetPassword } from './pages/ResetPassword';
import { TermSearch } from './pages/TermSearch';
import { SearchFilters } from './pages/SearchFilters';
import { TermDetail } from './pages/TermDetail';
import { SemanticSearch } from './pages/SemanticSearch';
import { Analyze } from './pages/Analyze';
import { Tests } from './pages/Tests';
import { TestQuestionPage } from './pages/TestQuestionPage';
import { PracticeByTopicPage } from './pages/PracticeByTopicPage';
import { Profile } from './pages/Profile';
import { Favorites } from './pages/Favorites';
import { useAuthStore } from './stores/authStore';
import { useFavoritesStore } from './features/favorites/model';

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function Public({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
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
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/onboarding" element={<Onboarding />} />

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
          path="/semantic-search"
          element={
            <Protected>
              <SemanticSearch />
            </Protected>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
