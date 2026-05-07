import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AuthToken } from "../types";

interface Props {
  user: AuthToken;
  onLogout: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/alarms": "Alarmes",
  "/onts": "ONTs registradas",
  "/provision": "Provisionar ONT",
  "/autofind": "Autofind",
  "/terminal": "Terminal",
  "/logs": "Logs",
  "/users": "Usuários",
  "/templates": "Templates",
  "/settings": "Configurações",
};

export function Layout({ user, onLogout }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const saved = window.localStorage.getItem("olt_sidebar_collapsed");
    if (saved === "1") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("olt_sidebar_collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  // fecha sidebar mobile ao navegar
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = PAGE_TITLES[location.pathname] ?? "OLT Manager";

  return (
    <div className="min-h-dvh bg-transparent text-ink-900">
      <Sidebar
        user={user}
        onLogout={onLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Topbar mobile */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink-200 bg-white/90 px-4 py-3 backdrop-blur-sm md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-700"
          aria-label="Abrir menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>
        <span className="font-display text-[0.95rem] font-semibold tracking-[-0.02em] text-ink-900 truncate">
          {pageTitle}
        </span>
      </header>

      <main
        id="main-content"
        className={`min-h-dvh overflow-x-hidden px-4 py-5 sm:px-5 xl:px-8 transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-[5rem]" : "md:ml-[18rem]"
        }`}
      >
        <div className="pb-10">
          <Outlet context={{ user, openSidebar: () => setSidebarOpen(true) }} />
        </div>
      </main>
    </div>
  );
}
