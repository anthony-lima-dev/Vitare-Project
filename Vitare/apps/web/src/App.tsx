import { useEffect } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";

import LandingPage from "./presentation/pages/page";
import LoginPage from "./presentation/pages/login/page";
import ForgotPasswordPage from "./presentation/pages/esqueci-senha/page";
import ResetPasswordPage from "./presentation/pages/auth/reset-passworld/page";
import GoogleCallbackPage from "./presentation/pages/auth/google/callback/page";
import CadastroPage from "./presentation/pages/cadastro/page";
import Dashboard from "./presentation/pages/dashboard/page";
import MedicationsPage from "./presentation/pages/medicamentos/page";
import ChronicDiseasesPage from "./presentation/pages/doencas-cronicas/page";
import EmergencyContactsPage from "./presentation/pages/contatos-emergencia/page";
import UserProfilePage from "./presentation/pages/perfil/page";
import { ProtectedRoute } from "./presentation/components/protected-route";
import CompleteRegisterPage from "./presentation/pages/completar-cadastro/page";
import AllergiesPage from "./presentation/pages/alergias/page";
import NotFoundPage from "./presentation/pages/not-found/page";
import { InstallPrompt } from "./presentation/components/install-prompt";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <InstallPrompt appName="Vitare" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medicamentos"
          element={
            <ProtectedRoute>
              <MedicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/completar-cadastro"
          element={
            <ProtectedRoute>
              <CompleteRegisterPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doencas-cronicas"
          element={
            <ProtectedRoute>
              <ChronicDiseasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alergias"
          element={
            <ProtectedRoute>
              <AllergiesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contatos-emergencia"
          element={
            <ProtectedRoute>
              <EmergencyContactsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Backward-compatible aliases for the temporary /minha-saude/* paths. */}
        <Route
          path="/minha-saude/doencas-cronicas"
          element={<Navigate to="/doencas-cronicas" replace />}
        />
        <Route
          path="/minha-saude/alergias"
          element={<Navigate to="/alergias" replace />}
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
