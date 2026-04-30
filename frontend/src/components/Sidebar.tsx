import { NavLink, useNavigate } from "react-router-dom";
import { AuthToken } from "../types";

interface Props {
  user: AuthToken;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

const links = [
  { to: "/", label: "Dashboard", icon: "DB" },
  { to: "/autofind", label: "Autofind", icon: "AF" },
  { to: "/provision", label: "Provisionar ONT", icon: "PV" },
  { to: "/onts", label: "ONTs Registradas", icon: "ON" },
  { to: "/alarms", label: "Alarmes", icon: "AL" },
  { to: "/terminal", label: "Terminal", icon: "SH" },
  { to: "/audit", label: "Auditoria", icon: "LG" },
];

const adminLinks = [{ to: "/users", label: "Usuários", icon: "AD" }];

export function Sidebar({ user, onLogout, open, onClose }: Props) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
      isActive
        ? "bg-white/14 text-white shadow-lg shadow-black/10"
        : "text-brand-100/80 hover:bg-white/8 hover:text-white"
    }`;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-ink-900/45 backdrop-blur-sm transition md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside className={`fixed inset-y-3 left-3 z-40 flex min-h-[calc(100vh-1.5rem)] w-[18rem] flex-col overflow-hidden rounded-[2rem] border border-white/8 bg-gradient-to-b from-[#141824] via-[#1c2231] to-[#20263a] shadow-panel transition-transform duration-300 md:relative md:inset-auto md:z-auto md:m-3 md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-[120%] md:translate-x-0"
      }`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_28rem)]" />
        <div className="relative border-b border-white/10 px-6 py-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-brand-100/70">
              Control Surface
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brand-100/70 md:hidden"
              aria-label="Fechar menu"
            >
              ×
            </button>
          </div>
          <h1 className="text-2xl font-bold leading-tight text-white">OLT Manager</h1>
          <p className="mt-1 text-sm text-brand-100/65">Huawei MA5800-X2 operations</p>
        </div>

        <nav className="relative flex-1 space-y-1 px-3 py-4">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={linkClass} onClick={onClose}>
              {({ isActive }) => (
                <>
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-[11px] font-semibold tracking-[0.18em] ${
                    isActive
                      ? "border-white/20 bg-white/12 text-white"
                      : "border-white/8 bg-white/5 text-brand-100/70 group-hover:border-white/16 group-hover:text-white"
                  }`}>
                    {l.icon}
                  </span>
                  <span>{l.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {user.is_admin && (
            <>
              <div className="px-4 pb-2 pt-4 text-[11px] uppercase tracking-[0.24em] text-brand-100/45">Admin</div>
              {adminLinks.map((l) => (
                <NavLink key={l.to} to={l.to} className={linkClass} onClick={onClose}>
                  {({ isActive }) => (
                    <>
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-[11px] font-semibold tracking-[0.18em] ${
                        isActive
                          ? "border-white/20 bg-white/12 text-white"
                          : "border-white/8 bg-white/5 text-brand-100/70 group-hover:border-white/16 group-hover:text-white"
                      }`}>
                        {l.icon}
                      </span>
                      <span>{l.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="relative border-t border-white/10 px-4 py-4">
          <div className="panel-muted mb-3 px-4 py-3 text-sm text-brand-100/70">
            <div className="font-medium text-white">{user.full_name}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-brand-100/45">{user.username}{user.is_admin ? " / admin" : ""}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-brand-100/80 transition hover:bg-white/10 hover:text-white"
          >
            Encerrar sessão
          </button>
        </div>
      </aside>
    </>
  );
}
