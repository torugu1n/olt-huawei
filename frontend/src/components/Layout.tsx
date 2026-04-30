import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { AuthToken } from "../types";

interface Props {
  user: AuthToken;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-transparent text-ink-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-brand-200/45 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-6rem] h-80 w-80 rounded-full bg-brand-500/10 blur-3xl" />
      </div>
      <Sidebar user={user} onLogout={onLogout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main id="main-content" className="relative flex-1 overflow-auto">
        <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-ink-800 shadow-panel backdrop-blur"
              aria-label="Abrir menu"
            >
              <span className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
              </span>
            </button>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.22em] text-ink-400">OLT Manager</div>
              <div className="text-sm font-semibold text-ink-900">MA5800-X2</div>
            </div>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
