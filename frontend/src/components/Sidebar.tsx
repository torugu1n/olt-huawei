import { useMemo, useState } from "react";
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

type NavItem = {
  to: string;
  label: string;
  icon: string;
};

type NavGroup = {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
};

export function Sidebar({ user, onLogout, open, onClose, collapsed, onToggleCollapse }: Props) {
  const navigate = useNavigate();
  const { t, theme, toggleTheme } = useUISettings();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    operations: true,
    management: true,
    admin: true,
  });

  const standaloneItems: NavItem[] = [
    { to: "/", label: t("nav.dashboard"), icon: "home" },
    { to: "/alarms", label: t("nav.alarms"), icon: "calendar_month" },
  ];

  const groups = useMemo<NavGroup[]>(() => {
    const baseGroups: NavGroup[] = [
      {
        id: "operations",
        label: t("group.operations"),
        icon: "event_note",
        items: [
          { to: "/onts", label: t("nav.onts"), icon: "lan" },
          { to: "/provision", label: t("nav.provision"), icon: "add_circle" },
          { to: "/autofind", label: t("nav.autofind"), icon: "radar" },
        ],
      },
      {
        id: "management",
        label: t("group.management"),
        icon: "bar_chart",
        items: [
          { to: "/terminal", label: t("nav.terminal"), icon: "terminal" },
          { to: "/logs", label: t("nav.audit"), icon: "receipt_long" },
        ],
      },
    ];

    if (user.is_admin) {
      baseGroups.push({
        id: "admin",
        label: t("group.admin"),
        icon: "settings",
        items: [
          { to: "/users", label: t("nav.users"), icon: "group" },
          { to: "/templates", label: "Templates", icon: "inventory_2" },
          { to: "/settings", label: "Configurações", icon: "tune" },
        ],
      });
    }

    return baseGroups;
  }, [t, user.is_admin]);

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-ink-900/25 backdrop-blur-sm transition md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-ink-200 bg-white transition-all duration-300 md:translate-x-0 ${
          collapsed ? "w-[5rem]" : "w-[18rem]"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-5">
          {!collapsed ? (
            <div className="min-w-0">
              <div className="font-display text-[1.05rem] font-semibold tracking-[-0.03em] text-ink-900">
                Gerenciador de OLTs
              </div>
              <div className="mt-1 text-[12px] text-ink-500">{t("app.subtitle")}</div>
            </div>
          ) : (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-200 bg-brand-50 text-brand-700">
              <span className="material-symbols-outlined text-[18px]">hub</span>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:border-ink-300 hover:text-ink-700 md:inline-flex"
          >
            <span className="material-symbols-outlined text-[18px]">{collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-1.5">
            {standaloneItems.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                collapsed={collapsed}
                onClose={onClose}
              />
            ))}
          </nav>

          {groups.map((group) => {
            const expanded = expandedGroups[group.id] ?? true;
            return (
              <div key={group.id} className="mt-3 border-t border-ink-100 pt-3">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`flex w-full items-center rounded-xl px-3 py-3 text-left transition hover:bg-ink-50 ${
                    collapsed ? "justify-center" : "gap-3"
                  }`}
                  aria-label={group.label}
                  title={collapsed ? group.label : undefined}
                >
                  <span className="material-symbols-outlined text-[18px] text-ink-500">{group.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-[0.94rem] font-medium text-ink-700">{group.label}</span>
                      <span className={`material-symbols-outlined text-[18px] text-ink-400 transition ${expanded ? "rotate-180" : ""}`}>
                        expand_more
                      </span>
                    </>
                  )}
                </button>

                {!collapsed && expanded && (
                  <div className="mt-1 space-y-1 pl-2">
                    {group.items.map((item) => (
                      <SidebarLink
                        key={item.to}
                        item={item}
                        collapsed={false}
                        onClose={onClose}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-ink-200 px-4 py-4">
          {!collapsed ? (
            <>
              <div className="flex items-center justify-between rounded-2xl border border-ink-200 bg-ink-50 px-3 py-3">
                <div>
                  <div className="text-[13px] font-medium text-ink-700">Tema</div>
                  <div className="text-[11px] text-ink-400">{theme === "dark" ? "Escuro" : "Claro"}</div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative h-7 w-12 rounded-full transition ${
                    theme === "dark" ? "bg-brand-600" : "bg-ink-200"
                  }`}
                  aria-label="Alternar tema"
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full shadow-sm transition ${
                      theme === "dark" ? "left-6" : "left-1"
                    }`}
                    style={{ backgroundColor: "white" }}
                  />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-ink-200 bg-white px-3 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink-900">{user.full_name || user.username}</div>
                  <div className="text-[12px] text-ink-400">{user.is_admin ? "Administrador" : "Operador"}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 text-ink-500 transition hover:border-ink-300 hover:text-ink-700"
                  aria-label={t("logout")}
                >
                  <span className="material-symbols-outlined text-[17px]">logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <button
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-ink-50 text-ink-500 transition hover:border-ink-300 hover:text-ink-700"
                aria-label="Alternar tema"
              >
                <span className="material-symbols-outlined text-[18px]">{theme === "dark" ? "dark_mode" : "light_mode"}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:border-ink-300 hover:text-ink-700"
                aria-label={t("logout")}
              >
                <span className="material-symbols-outlined text-[17px]">logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function SidebarLink({
  item,
  collapsed,
  onClose,
  compact = false,
}: {
  item: NavItem;
  collapsed: boolean;
  onClose: () => void;
  compact?: boolean;
}) {
  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/"}
      onClick={onClose}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group flex items-center rounded-2xl border transition ${
          isActive
            ? "border-ink-300 bg-ink-100 text-ink-900"
            : "border-transparent text-ink-600 hover:border-ink-200 hover:bg-ink-50 hover:text-ink-900"
        } ${
          collapsed
            ? "justify-center px-0 py-3"
            : compact
              ? "gap-3 px-3 py-2.5"
              : "gap-3 px-3 py-3"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`material-symbols-outlined text-[18px] ${isActive ? "text-brand-700" : "text-ink-400 group-hover:text-ink-700"}`}>
            {item.icon}
          </span>
          {!collapsed && <span className={`${isActive ? "font-semibold" : "font-medium"} text-[0.94rem]`}>{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}
