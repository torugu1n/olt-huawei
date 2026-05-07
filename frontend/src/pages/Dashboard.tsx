import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { getDashboardSummary } from "../api/client";
import { AuthToken, Board, Alarm, AutofindONT, DashboardSummary } from "../types";
import { StatusBadge } from "../components/StatusBadge";

const DASHBOARD_CACHE_KEY = "dashboard_summary_cache";

function readDashboardCache(): DashboardSummary | null {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: DashboardSummary };
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function writeDashboardCache(data: DashboardSummary) {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ data, saved_at: Date.now() }));
  } catch {
    // Ignora falha de cache local.
  }
}

function looksLikeTransientOltBlock(summary: DashboardSummary) {
  const message = String(summary.status?.message ?? "").toLowerCase();
  const emptyEverything =
    (summary.onts_total ?? 0) === 0 &&
    (summary.boards?.length ?? 0) === 0 &&
    (summary.alarms?.length ?? 0) === 0 &&
    (summary.autofind?.length ?? 0) === 0 &&
    (summary.gpon_ports?.length ?? 0) === 0;

  return emptyEverything && (
    message.includes("reenter times have reached the upper limit") ||
    message.includes("bloqueou") ||
    message.includes("timeout")
  );
}

export function Dashboard() {
  const { user, openSidebar } = useOutletContext<{ user: AuthToken; openSidebar: () => void }>();
  const cached = readDashboardCache();
  const [status, setStatus] = useState<{ connected: boolean; message: string } | null>(cached?.status ?? null);
  const [boards, setBoards] = useState<Board[]>(cached?.boards ?? []);
  const [alarms, setAlarms] = useState<Alarm[]>(cached?.alarms ?? []);
  const [autofind, setAutofind] = useState<AutofindONT[]>(cached?.autofind ?? []);
  const [ontsTotal, setOntsTotal] = useState(cached?.onts_total ?? 0);
  const [ontsOnline, setOntsOnline] = useState(cached?.onts_online ?? 0);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const load = async () => {
      setRefreshing(true);
      try {
        const { data } = await getDashboardSummary();
        const summary = data as DashboardSummary;
        if (looksLikeTransientOltBlock(summary)) {
          setStatus(summary.status);
          return;
        }
        writeDashboardCache(summary);
        setStatus(summary.status);
        setBoards(summary.boards ?? []);
        setAlarms(summary.alarms ?? []);
        setAutofind(summary.autofind ?? []);
        setOntsTotal(summary.onts_total ?? 0);
        setOntsOnline(summary.onts_online ?? 0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
    load();
  }, []);

  const alarmCount = { Critical: 0, Major: 0, Minor: 0, Warning: 0 };
  alarms.forEach((a) => { alarmCount[a.severity] = (alarmCount[a.severity] ?? 0) + 1; });
  const activeBoards = boards.filter((board) => {
    const status = board.status.toLowerCase();
    return status.includes("normal") || status.includes("active");
  }).length;
  const faultyBoards = boards.filter((board) => {
    const status = board.status.toLowerCase();
    const onlineState = board.online_state.toLowerCase();
    return status.includes("failed") || onlineState.includes("offline");
  }).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-3">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:border-brand-200 hover:text-brand-700 md:hidden"
              onClick={openSidebar}
              aria-label="Abrir menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div className="eyebrow">OLT Summary</div>
          </div>
          <h1 className="font-display text-[1.7rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink-900 md:text-[2.15rem]">
            Operational Status
          </h1>
          <p className="mt-2 max-w-3xl text-[14px] leading-6 text-ink-500">
            Visão consolidada do inventário, alarmes, chassi e fila operacional de provisionamento.
          </p>
        </div>
        <div className="panel-muted flex items-center gap-3 px-4 py-3">
          <div className="hidden sm:block">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Sessão</div>
            <div className="text-[13px] font-semibold text-ink-900">{user.full_name || user.username}</div>
          </div>
          <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-sm font-medium text-ink-700 sm:flex">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="h-8 w-px bg-ink-200" />
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-700">
            <span className={`h-2 w-2 rounded-full ${status?.connected ? "bg-emerald-500" : "bg-amber-500"}`} />
            {status?.connected ? "Sistema online" : "Snapshot degradado"}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">
            {refreshing ? "Sync em andamento" : "Sync local"}
          </span>
        </div>
      </div>

      {loading && <div className="panel-muted px-4 py-3 text-[13px] text-ink-500">Carregando telemetria da OLT...</div>}

      <Section
        title="Resumo operacional"
        subtitle="Visão direta do que importa agora: base instalada, descoberta, alarmes prioritários e estado geral do chassi."
      >
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <StatCard
            label="ONTs online"
            value={ontsOnline}
            total={ontsTotal}
            tone="brand"
            link="/onts"
            note={`${ontsTotal - ontsOnline} offline`}
          />
          <StatCard
            label="Fila de autofind"
            value={autofind.length}
            tone="neutral"
            link="/autofind"
            note={autofind.length > 0 ? "Aguardando provisão" : "Sem pendências"}
          />
          <StatCard
            label="Alarmes críticos"
            value={alarmCount.Critical + alarmCount.Major}
            tone={alarmCount.Critical + alarmCount.Major > 0 ? "warning" : "neutral"}
            link="/alarms"
            note={`${alarms.length} itens lidos`}
          />
          <StatCard
            label="Boards ativas"
            value={activeBoards}
            total={boards.length}
            tone={faultyBoards > 0 ? "danger" : "neutral"}
            note={faultyBoards > 0 ? `${faultyBoards} com falha ou offline` : "Estado do chassis"}
          />
        </div>
      </Section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Section
          title="Alertas ativos"
          subtitle="Eventos correntes que exigem atenção ou acompanhamento."
          link="/alarms"
        >
          {alarms.length === 0 ? (
            <EmptyState text="Nenhum alarme ativo no snapshot atual." tone="ok" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {alarms.slice(0, 6).map((alarm) => (
                <div key={alarm.seq} className="panel-muted px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-medium text-ink-900">{alarm.name}</div>
                      <div className="mt-1 text-[11px] text-ink-500">{alarm.location}</div>
                    </div>
                    <StatusBadge value={alarm.severity} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Autofind operacional"
          subtitle="ONTs encontradas e prontas para seguir para a provisão assistida."
          link="/autofind"
        >
          {autofind.length === 0 ? (
            <EmptyState text="Sem ONTs aguardando provisionamento." />
          ) : (
            <div className="space-y-3">
              {autofind.slice(0, 5).map((ont, index) => (
                <div key={`${ont.sn}-${index}`} className="panel-muted flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-ink-500">{ont.frame}/{ont.slot}/{ont.port}</div>
                    <div className="truncate font-mono text-[13px] font-semibold text-ink-800">{ont.sn}</div>
                    <div className="text-[12px] text-ink-500">{ont.vendor_id || "Vendor não identificado"}</div>
                  </div>
                  <Link
                    to={`/provision?sn=${ont.sn}&port=${ont.port}`}
                    className="inline-flex shrink-0 items-center rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-700 transition hover:border-brand-200 hover:text-brand-700"
                  >
                    Provisionar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="Boards e chassi" subtitle="Leitura resumida da control board e estado principal.">
        {boards.length === 0 ? (
          <EmptyState text="Nenhuma board retornada pela OLT." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-[13px]">
              <thead>
                <tr className="border-b border-ink-100 text-left text-[10px] uppercase tracking-[0.16em] text-ink-400">
                  <th className="pb-2.5">Slot</th>
                  <th className="pb-2.5">Board</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Presença</th>
                  <th className="pb-2.5">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {boards.map((board) => (
                  <tr key={`${board.slot}-${board.board_name}`} className="border-b border-ink-100/80 last:border-0">
                    <td className="py-2.5 font-mono text-[12px] text-ink-700">{board.slot}</td>
                    <td className="py-2.5 font-medium text-ink-900">{board.board_name}</td>
                    <td className="py-2.5"><StatusBadge value={board.status} /></td>
                    <td className="py-2.5">
                      {board.online_state ? <StatusBadge value={board.online_state} /> : <span className="text-ink-400">—</span>}
                    </td>
                    <td className="py-2.5 text-ink-500">{board.sub_type || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function StatCard({ label, value, total, tone, link, note }: {
  label: string;
  value: number;
  total?: number;
  tone: "brand" | "neutral" | "warning" | "danger";
  link?: string;
  note?: string;
}) {
  const tones = {
    brand: {
      panel: "border-ink-200 bg-white",
      line: "bg-brand-500/80",
    },
    neutral: {
      panel: "border-ink-200 bg-white",
      line: "bg-ink-200",
    },
    warning: {
      panel: "border-ink-200 bg-white",
      line: "bg-amber-400/80",
    },
    danger: {
      panel: "border-ink-200 bg-white",
      line: "bg-red-400/80",
    },
  } as const;

  const content = (
    <div className={`relative overflow-hidden rounded-[1rem] border px-5 py-4 shadow-panel ${tones[tone].panel}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${tones[tone].line}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
          <div className="mt-5 text-[1.75rem] font-semibold leading-none text-ink-900 md:text-[1.95rem]">
            {value}
            {total !== undefined && <span className="ml-2 text-[0.95rem] text-ink-400">/ {total}</span>}
          </div>
        </div>
        <div className="font-mono rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-950/50 dark:text-emerald-400">
          Agora
        </div>
      </div>
      {note && <div className="mt-4 text-[13px] text-ink-500">{note}</div>}
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

function Section({
  title,
  subtitle,
  children,
  link,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  link?: string;
  className?: string;
}) {
  return (
    <section className={`panel px-5 py-5 md:px-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-ink-100 pb-4">
        <div>
          <h3 className="font-display text-[1.05rem] font-semibold tracking-[-0.01em] text-ink-900">{title}</h3>
          {subtitle && <p className="mt-1.5 text-[13px] leading-6 text-ink-500">{subtitle}</p>}
        </div>
        {link && (
          <Link to={link} className="font-mono rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-ink-600 transition hover:bg-ink-100">
            Ver tudo
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text, tone = "muted" }: { text: string; tone?: "muted" | "ok" }) {
  return (
    <div className={`panel-muted px-4 py-4 text-[13px] ${tone === "ok" ? "text-ink-600" : "text-ink-500"}`}>
      {text}
    </div>
  );
}
