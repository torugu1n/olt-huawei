import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Autofind } from "./pages/Autofind";
import { Provision } from "./pages/Provision";
import { ONTs } from "./pages/ONTs";
import { Alarms } from "./pages/Alarms";
import { Terminal } from "./pages/Terminal";
import { AuditLogPage } from "./pages/AuditLog";
import { Users } from "./pages/Users";
import { TemplatesPage } from "./pages/Templates";
import { ONTDetail } from "./pages/ONTDetail";
import { useUISettings } from "./context/UISettingsContext";

export default function App() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { t } = useUISettings();

  return (
    <BrowserRouter>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-900 focus:shadow-panel"
      >
        {t("skip.content")}
      </a>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={login} />
        } />

        <Route element={
          isAuthenticated && user ? <Layout user={user} onLogout={logout} /> : <Navigate to="/login" replace />
        }>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alarms" element={<Alarms />} />
          <Route path="/onts" element={<ONTs />} />
          <Route path="/onts/:slot/:port/:ont_id" element={<ONTDetail />} />
          <Route path="/autofind" element={<Autofind />} />
          <Route path="/provision" element={<Provision />} />
          <Route path="/terminal" element={<Terminal />} />
          <Route path="/audit" element={<AuditLogPage />} />
          {user?.is_admin && <Route path="/users" element={<Users />} />}
          {user?.is_admin && <Route path="/templates" element={<TemplatesPage />} />}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
