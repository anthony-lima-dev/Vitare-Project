import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import StaffEntryPage from "./presentation/pages/entry/page";
import StaffLoginPage from "./presentation/pages/login/page";
import StaffSignupPage from "./presentation/pages/cadastro/page";
import StaffEmergenciesPage from "./presentation/pages/emergencias/page";
import StaffPatientsPage from "./presentation/pages/pacientes/page";
import StaffNotFoundPage from "./presentation/pages/not-found/page";
import { StaffAuthProvider } from "./presentation/contexts/staff-auth-context";
import { StaffProtectedRoute } from "./presentation/components/staff-protected-route";
import { InstallPrompt } from "./presentation/components/install-prompt";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <StaffAuthProvider>
      <ScrollToTop />
      <InstallPrompt appName="Vitare Equipe" />
      <Routes>
        <Route path="/" element={<StaffEntryPage />} />
        <Route path="/login" element={<StaffLoginPage />} />
        <Route path="/cadastro" element={<StaffSignupPage />} />
        <Route path="/emergencias" element={<StaffProtectedRoute><StaffEmergenciesPage /></StaffProtectedRoute>} />
        <Route path="/pacientes" element={<StaffProtectedRoute><StaffPatientsPage /></StaffProtectedRoute>} />
        <Route path="*" element={<StaffNotFoundPage />} />
      </Routes>
    </StaffAuthProvider>
  );
}
