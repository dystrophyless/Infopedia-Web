import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { GoogleCallback } from './pages/GoogleCallback';
import { Onboarding } from './pages/Onboarding';
import { TermSearch } from './pages/TermSearch';
import { TermDetail } from './pages/TermDetail';
import { SemanticSearch } from './pages/SemanticSearch';
import { Profile } from './pages/Profile';

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
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/onboarding" element={<Onboarding />} />

        <Route
          path="/"
          element={
            <Public>
              <Landing />
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
          path="/terms/:id"
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
          path="/profile"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
