import { NavLink, useNavigate } from "react-router-dom";
import { AuthToken } from "../types";
import { useUISettings } from "../context/UISettingsContext";

interface Props {
  user: AuthToken;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ user, onLogout, open, onClose, collapsed, onToggleCollapse }: Props) {
  const navigate = useNavigate();
  const { t } = useUISettings();

  const primaryLinks = [
    { to: "/", label: t("nav.dashboard"), icon: "dashboard" },
    { to: "/onts", label: t("nav.onts"), icon: "router" },
    { to: "/provision", label: t("nav.provision"), icon: "settings_input_component" },
    { to: "/autofind", label: t("nav.autofind"), icon: "monitoring" },
  ];

  const groups = [
    {
      title: t("group.management"),
      items: [
        { to: "/alarms", label: t("nav.alarms"), icon: "warning" },
        { to: "/terminal", label: t("nav.terminal"), icon: "terminal" },
        { to: "/audit", label: t("nav.audit"), icon: "history" },
      ],
    },
    {
      title: t("group.admin"),
      items: [
        { to: "/users", label: t("nav.users"), icon: "group" },
        { to: "/templates", label: "Templates", icon: "assignment" },
      ],
    },
  ];

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center rounded-xl border px-3.5 py-3 text-sm transition ${
      isActive
        ? "border-brand-200 bg-white text-brand-700 shadow-sm"
        : "border-transparent text-ink-500 hover:border-ink-200 hover:bg-white/85 hover:text-ink-700"
    } ${collapsed ? "justify-center gap-0" : "gap-3"}`;

  const renderItem = (item: { to: string; label: string; icon: string }) => (
    <NavLink
      key={`${item.to}-${item.label}`}
      to={item.to}
      end={item.to === "/" && item.icon === "dashboard"}
      className={linkClass}
      onClick={onClose}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
    >
      {({ isActive }) => (
        <>
          <span className={`material-symbols-outlined text-[18px] ${isActive ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"}`}>
            {item.icon}
          </span>
          {!collapsed && <span className={`${isActive ? "font-semibold" : "font-medium"} text-[0.88rem]`}>{item.label}</span>}
        </>
      )}
    </NavLink>
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-ink-900/25 backdrop-blur-sm transition md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-ink-200/80 bg-[rgba(250,252,255,0.98)] backdrop-blur-xl transition-all duration-300 md:top-0 md:z-20 md:h-dvh md:translate-x-0 ${
          collapsed ? "w-[4.5rem]" : "w-[16.5rem]"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex-1 overflow-y-auto">
          {!collapsed && (
            <div className="px-5 py-5">
              <div className="rounded-[1rem] border border-ink-200/80 bg-white px-4 py-4 shadow-sm">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <span className="material-symbols-outlined text-[18px]">hub</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-ink-900">Core_Node_01</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">Operational</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={`px-3 pb-4 ${collapsed ? "px-2 pt-3" : ""}`}>
            <div className="space-y-1.5">{primaryLinks.map(renderItem)}</div>
          </div>

          {groups
            .map((group) =>
              group.title === t("group.admin") && !user.is_admin
                ? { ...group, items: [] }
                : group,
            )
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <div key={group.title} className={`border-t border-ink-200/70 px-3 py-4 ${collapsed ? "px-2" : ""}`}>
                {!collapsed && (
                  <div className="mb-3 px-2 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-400">{group.title}</div>
                )}
                <div className="space-y-1.5">{group.items.map(renderItem)}</div>
              </div>
            ))}
        </div>

        <div className={`mt-auto border-t border-ink-200/80 px-3 py-4 ${collapsed ? "px-2" : ""}`}>
          <button
            onClick={handleLogout}
            aria-label={t("logout")}
            title={collapsed ? t("logout") : undefined}
            className={`flex w-full items-center rounded-xl px-3.5 py-2.5 text-[13px] text-ink-500 transition hover:bg-white hover:text-ink-700 ${
              collapsed ? "justify-center gap-0" : "gap-3"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            {!collapsed && t("logout")}
          </button>

          {!collapsed && <div className="mt-3 px-2 text-[10px] text-ink-400">v0.1.0</div>}
        </div>
      </aside>
    </>
  );
}
