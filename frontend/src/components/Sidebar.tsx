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
    { to: "/alarms", label: t("nav.alarms"), icon: "warning" },
  ];

  const groups = [
    {
      title: t("group.operations"),
      items: [
        { to: "/onts", label: t("nav.onts"), icon: "lan" },
        { to: "/autofind", label: t("nav.autofind"), icon: "travel_explore" },
        { to: "/provision", label: t("nav.provision"), icon: "deployed_code" },
      ],
    },
    {
      title: t("group.management"),
      items: [
        { to: "/terminal", label: t("nav.terminal"), icon: "terminal" },
        { to: "/audit", label: t("nav.audit"), icon: "history" },
      ],
    },
    {
      title: t("group.admin"),
      items: [
        { to: "/users", label: t("nav.users"), icon: "group" },
        { to: "/templates", label: "Templates", icon: "assignment" }
      ],
    },
  ];

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center rounded-xl border px-3 py-2.5 text-sm transition ${
      isActive
        ? "border-brand-200 bg-white text-brand-700 shadow-sm"
        : "border-transparent text-ink-500 hover:border-ink-200 hover:bg-white/80 hover:text-ink-700"
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
          {!collapsed && <span className={`${isActive ? "font-medium" : "font-normal"}`}>{item.label}</span>}
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
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-ink-200/80 bg-[rgba(249,251,252,0.98)] backdrop-blur-xl transition-all duration-300 md:sticky md:top-0 md:z-20 md:h-dvh md:translate-x-0 ${
          collapsed ? "w-[5.25rem]" : "w-[16rem]"
        } ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`relative flex h-[4.5rem] items-center border-b border-ink-200/80 ${collapsed ? "justify-center px-2" : "px-5 pr-10"}`}>
          <div className={`flex min-w-0 items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-200 bg-white text-brand-700 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">router</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-display truncate text-[1.05rem] font-semibold tracking-[-0.02em] text-ink-900">{t("app.title")}</div>
                <div className="line-clamp-2 text-[11px] leading-4 text-ink-500">{t("app.subtitle")}</div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            className={`absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-400 transition hover:border-brand-200 hover:text-brand-600 md:inline-flex ${
              collapsed ? "right-2" : "right-3"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className={`border-b border-ink-200/80 px-3 py-3 ${collapsed ? "px-2.5" : ""}`}>
            <div className="space-y-1.5">{primaryLinks.map(renderItem)}</div>
          </div>

          {groups
            .map((group) =>
              group.title === t("group.admin") && !user.is_admin
                ? { ...group, items: [] }
                : group
            )
            .filter((group) => group.items.length > 0)
            .map((group) => (
            <div key={group.title} className={`border-b border-ink-200/70 px-3 py-4 ${collapsed ? "px-2.5" : ""}`}>
              {!collapsed && (
                <div className="mb-3 px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">{group.title}</div>
              )}
              <div className="space-y-1.5">{group.items.map(renderItem)}</div>
            </div>
          ))}
        </div>

        <div className={`mt-auto border-t border-ink-200/80 px-3 py-3 ${collapsed ? "px-2.5" : ""}`}>
          {!collapsed && (
            <div className="mb-3 rounded-xl border border-ink-200/80 bg-white px-3 py-3 shadow-sm">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Usuário ativo</div>
              <div className="mt-2 text-sm font-semibold text-ink-800">{user.full_name || user.username}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-400">
                {user.is_admin ? "Admin" : "Operador"}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            aria-label={t("logout")}
            title={collapsed ? t("logout") : undefined}
            className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-ink-500 transition hover:bg-white hover:text-ink-700 ${
              collapsed ? "justify-center gap-0" : "gap-3"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {!collapsed && t("logout")}
          </button>
          {!collapsed && <div className="mt-3 px-1 text-[11px] text-ink-400">v0.1.0</div>}
        </div>
      </aside>
    </>
  );
}
