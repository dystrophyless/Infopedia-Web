import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <Protected>
              <Landing />
            </Protected>
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
            <Protected>
              <TermDetail />
            </Protected>
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
