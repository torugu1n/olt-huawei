import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Setup } from "./pages/Setup";
import { Dashboard } from "./pages/Dashboard";
import { Autofind } from "./pages/Autofind";
import { Provision } from "./pages/Provision";
import { ONTs } from "./pages/ONTs";
import { Alarms } from "./pages/Alarms";
import { Terminal } from "./pages/Terminal";
import { LogsPage } from "./pages/Logs";
import { Users } from "./pages/Users";
import { TemplatesPage } from "./pages/Templates";
import { ONTDetail } from "./pages/ONTDetail";
import { SettingsPage } from "./pages/Settings";
import { useUISettings } from "./context/UISettingsContext";
import { checkSetup } from "./api/client";

export default function App() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { t } = useUISettings();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    checkSetup()
      .then(({ data }) => setNeedsSetup(data.needs_setup))
      .catch(() => setNeedsSetup(false));
  }, []);

  if (needsSetup === null) return null;

  return (
    <BrowserRouter>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-900 focus:shadow-panel"
      >
        {t("skip.content")}
      </a>
      <Routes>
        <Route path="/setup" element={
          needsSetup ? <Setup onComplete={() => setNeedsSetup(false)} /> : <Navigate to="/login" replace />
        } />

        <Route path="/login" element={
          needsSetup ? <Navigate to="/setup" replace /> :
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
          <Route path="/terminal" element={user?.is_readonly ? <Navigate to="/" replace /> : <Terminal />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/audit" element={<Navigate to="/logs" replace />} />
          {user?.is_admin && <Route path="/users" element={<Users />} />}
          {user?.is_admin && <Route path="/templates" element={<TemplatesPage />} />}
          {user?.is_admin && <Route path="/settings" element={<SettingsPage />} />}
        </Route>

        <Route path="*" element={<Navigate to={needsSetup ? "/setup" : "/"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
