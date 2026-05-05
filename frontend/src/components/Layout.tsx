import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AuthToken } from "../types";
import { useUISettings } from "../context/UISettingsContext";

interface Props {
  user: AuthToken;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { locale, t } = useUISettings();

  useEffect(() => {
    const saved = window.localStorage.getItem("olt_sidebar_collapsed");
    if (saved === "1") {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("olt_sidebar_collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-dvh bg-transparent text-ink-900 md:flex">
      <Sidebar
        user={user}
        onLogout={onLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
      />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-[rgba(250,252,255,0.92)] backdrop-blur-xl">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6 xl:px-8">
            <div className="flex items-center gap-2 md:hidden">
              <button
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-500 transition hover:border-brand-200 hover:text-brand-700"
                onClick={() => setSidebarOpen((current) => !current)}
                aria-label="Abrir menu"
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-200 bg-white text-brand-700 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">router</span>
                </div>
                <div>
                  <div className="font-display text-[1rem] font-semibold tracking-[-0.02em] text-ink-900">{t("app.title")}</div>
                  <div className="text-xs text-ink-500">{t("app.subtitle")}</div>
                </div>
              </div>
            </div>

            <div className="hidden flex-1 md:block">
              <label className="relative block max-w-4xl">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 text-ink-400">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </span>
                <input
                  type="text"
                  className="h-12 w-full rounded-[1.05rem] border border-ink-200 bg-white/98 pl-14 pr-5 text-sm font-medium text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100/50"
                  placeholder={t("search.placeholder")}
                />
              </label>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">

              <div className="hidden rounded-[1rem] border border-ink-200 bg-white px-5 py-3 sm:block">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">{t("session.label")}</div>
                <div className="text-sm font-semibold text-ink-900">{user.full_name || user.username}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white text-base font-medium text-ink-700">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="min-h-[calc(100dvh-6.25rem)] flex-1 overflow-x-hidden px-4 py-6 sm:px-6 xl:px-8"
        >
          <div className="pb-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
