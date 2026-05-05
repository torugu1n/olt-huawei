import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { AuthToken } from "../types";

interface Props {
  user: AuthToken;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    <div className="min-h-dvh bg-transparent text-ink-900">
      <Sidebar
        user={user}
        onLogout={onLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
      />

      <main
        id="main-content"
        className={`min-h-dvh overflow-x-hidden px-4 py-6 sm:px-5 xl:px-8 ${
          sidebarCollapsed ? "md:ml-[4.5rem]" : "md:ml-[16.5rem]"
        }`}
      >
        <div className="pb-8">
          <Outlet context={{ user, openSidebar: () => setSidebarOpen(true) }} />
        </div>
      </main>
    </div>
  );
}
