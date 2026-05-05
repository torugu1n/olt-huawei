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
        { to: "/templates", label: "Templates", icon: "assignment" },
      ],
    },
  ];

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center rounded-2xl border px-4 py-4 text-sm transition ${
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
          <span className={`material-symbols-outlined text-xl ${isActive ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"}`}>
            {item.icon}
          </span>
          {!collapsed && <span className={`${isActive ? "font-semibold" : "font-medium"} text-[0.95rem]`}>{item.label}</span>}
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
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-ink-200/80 bg-[rgba(250,252,255,0.98)] backdrop-blur-xl transition-all duration-300 md:sticky md:top-0 md:z-20 md:h-dvh md:translate-x-0 ${
          collapsed ? "w-20" : "w-[18.5rem]"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`relative border-b border-ink-200/80 ${collapsed ? "flex h-16 items-center justify-center px-2" : "min-h-[7.5rem] px-6 py-4 pr-16"}`}>
          <div className={`flex min-w-0 ${collapsed ? "items-center justify-center" : "items-start gap-4"}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ink-200 bg-white text-brand-700 shadow-sm">
              <span className="material-symbols-outlined text-xl">router</span>
            </div>
            {!collapsed && (
              <div className="min-w-0 max-w-[11.25rem] pt-0.5">
                <div className="font-display text-[1.12rem] font-bold leading-6 tracking-[-0.01em] text-ink-900">
                  {t("app.title")}
                </div>
                <div className="mt-1 text-[0.78rem] font-medium leading-5 text-ink-600">Huawei MA5800-X2</div>
                <div className="text-[0.78rem] leading-5 text-ink-500">Secretaria da Administração</div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            className={`absolute hidden h-8 w-8 items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-400 transition hover:border-brand-200 hover:text-brand-600 md:inline-flex ${
              collapsed ? "right-2 top-1/2 -translate-y-1/2" : "right-5 top-5"
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className={`border-b border-ink-200/80 px-4 py-4 ${collapsed ? "px-2.5" : ""}`}>
            <div className="space-y-2">{primaryLinks.map(renderItem)}</div>
          </div>

          {groups
            .map((group) =>
              group.title === t("group.admin") && !user.is_admin
                ? { ...group, items: [] }
                : group,
            )
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <div key={group.title} className={`border-b border-ink-200/70 px-4 py-6 ${collapsed ? "px-2.5" : ""}`}>
                {!collapsed && (
                  <div className="mb-4 px-2 font-mono text-[11px] uppercase tracking-[0.28em] text-ink-400">{group.title}</div>
                )}
                <div className="space-y-2">{group.items.map(renderItem)}</div>
              </div>
            ))}
        </div>

        <div className={`mt-auto border-t border-ink-200/80 px-4 py-5 ${collapsed ? "px-2.5" : ""}`}>
          {!collapsed && (
              <div className="mb-5 rounded-[1.25rem] border border-ink-200/80 bg-white px-5 py-5 shadow-sm">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Usuário ativo</div>
                <div className="mt-3 break-words text-[0.92rem] font-semibold leading-7 text-ink-800">{user.full_name || user.username}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.24em] text-ink-400">
                {user.is_admin ? "Admin" : "Operador"}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            aria-label={t("logout")}
            title={collapsed ? t("logout") : undefined}
            className={`flex w-full items-center rounded-2xl px-4 py-3 text-sm text-ink-500 transition hover:bg-white hover:text-ink-700 ${
              collapsed ? "justify-center gap-0" : "gap-3"
            }`}
          >
            <span className="material-symbols-outlined text-base">logout</span>
            {!collapsed && t("logout")}
          </button>

          {!collapsed && <div className="mt-4 px-2 text-[11px] text-ink-400">v0.1.0</div>}
        </div>
      </aside>
    </>
  );
}
