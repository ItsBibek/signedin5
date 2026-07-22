import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { ProposalEditorPage } from '@/pages/ProposalEditorPage';
import { ProposalDetailPage } from '@/pages/ProposalDetailPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PublicProposalPage } from '@/pages/PublicProposalPage';
import { AppLayout } from '@/components/AppLayout';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />
      <Route path="/p/:slug" element={<PublicProposalPage />} />
      <Route
        path="/dashboard"
        element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/templates"
        element={<ProtectedRoute><AppLayout><TemplatesPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/proposals/:id"
        element={<ProtectedRoute><AppLayout><ProposalDetailPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/proposals/:id/edit"
        element={<ProtectedRoute><AppLayout><ProposalEditorPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/settings"
        element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}
